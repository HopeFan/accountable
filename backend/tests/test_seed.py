import pytest
from sqlalchemy import delete, func, select

from app import db, seed


def dump():
    with db.get_engine().connect() as conn:
        return {
            t.name: [
                tuple(r)
                for r in conn.execute(
                    select(
                        *[c for c in t.c if c.name not in ("created_at", "updated_at")]
                    ).order_by(t.c.id)
                )
            ]
            for t in (db.organization, db.contact, db.deal, db.activity)
        }


def test_counts_and_coverage(seeded):
    deals = seeded.get("/api/deals").json()
    contacts = seeded.get("/api/contacts").json()
    orgs = seeded.get("/api/organizations").json()
    assert len(orgs) == 12 and len(contacts) == 35 and len(deals) == 40
    assert {d["stage"] for d in deals} == {
        "new",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
    }
    assert {c["status"] for c in contacts} == {"lead", "qualified", "customer"}
    assert all(2 <= o["contacts_count"] <= 4 for o in orgs)
    assert all(5000 <= d["value"] <= 100000 for d in deals)
    stages = [d["stage"] for d in deals]
    assert (stages.count("won"), stages.count("lost")) == (12, 5)
    assert 3 <= sum(d["is_late"] for d in deals) <= 4
    assert seeded.get("/api/organizations/1").json()["name"]  # linked data resolves


def test_deals_follow_the_rules(seeded):
    deals = seeded.get("/api/deals").json()
    org_of_contact = {
        c["id"]: c["organization_id"] for c in seeded.get("/api/contacts").json()
    }
    for d in deals:
        if d["contact_id"]:
            assert org_of_contact[d["contact_id"]] == d["organization_id"]
    usual = {
        "new": 5,
        "qualified": 20,
        "proposal": 40,
        "negotiation": 70,
        "won": 100,
        "lost": 0,
    }
    assert len([d for d in deals if d["probability"] != usual[d["stage"]]]) in (2, 3)
    for stage in ("new", "qualified", "proposal", "negotiation", "won", "lost"):
        positions = sorted(d["position"] for d in deals if d["stage"] == stage)
        assert positions == list(range(len(positions)))


def test_activities_and_follow_ups(seeded):
    with db.get_engine().connect() as conn:
        total = conn.execute(select(func.count()).select_from(db.activity)).scalar_one()
    assert 75 <= total <= 95
    follow_ups = seeded.get("/api/follow-ups").json()
    states = [f["follow_up_state"] for f in follow_ups]
    assert states.count("overdue") == 3 and states.count("open") >= 7
    assert 10 <= len(follow_ups) <= 12
    assert all(f["follow_up_date"] <= "2026-12-01" for f in follow_ups)


def test_every_non_new_deal_has_matching_stage_change(seeded):
    deals = seeded.get("/api/deals").json()
    for d in deals:
        entries = [
            a
            for a in seeded.get(f"/api/deals/{d['id']}").json()["timeline"]
            if a["type"] == "stage_change"
        ]
        if d["stage"] == "new":
            assert entries == []
        else:
            assert entries and entries[0]["description"].endswith(
                f"to {d['stage'].capitalize()}"
            )


def test_seeding_twice_gives_the_same_data(db_file):
    seed.reset()
    first = dump()
    seed.reset()
    assert dump() == first


def test_reset_replaces_changes(seeded):
    seeded.post("/api/organizations", json={"name": "Brand new"})
    seeded.delete("/api/deals/1")
    seed.reset()
    names = [o["name"] for o in seeded.get("/api/organizations").json()]
    assert (
        "Brand new" not in names
        and len(names) == 12
        and len(seeded.get("/api/deals").json()) == 40
    )


def count(table) -> int:
    with db.get_engine().connect() as conn:
        return conn.execute(select(func.count()).select_from(table)).scalar_one()


def test_database_is_created_and_seeded_when_missing(db_file):
    assert not db_file.exists()
    seed.ensure_seeded()
    assert db_file.exists()
    assert count(db.organization) == 12
    seed.ensure_seeded()  # an existing database isn't seeded again
    assert count(db.organization) == 12


def test_not_seeded_again_after_everything_is_deleted(db_file):
    seed.ensure_seeded()
    with db.get_engine().begin() as conn:
        for table in reversed(db.metadata.sorted_tables):
            conn.execute(delete(table))
    seed.ensure_seeded()
    assert count(db.organization) == 0


def test_an_older_database_with_tables_is_not_seeded(db_file):
    db.create_tables()
    seed.ensure_seeded()
    assert count(db.organization) == 0


def test_reset_recreates_the_sample_data_after_deleting_everything(db_file):
    seed.reset()
    with db.get_engine().begin() as conn:
        for table in reversed(db.metadata.sorted_tables):
            conn.execute(delete(table))
    seed.reset()
    assert (count(db.organization), count(db.contact), count(db.deal)) == (12, 35, 40)


@pytest.mark.parametrize("table", [db.organization, db.contact, db.deal, db.activity])
def test_sample_rows_have_no_author(db_file, table):
    seed.reset()
    with db.get_engine().connect() as conn:
        authored = conn.execute(
            select(func.count())
            .select_from(table)
            .where(table.c.created_by.is_not(None) | table.c.updated_by.is_not(None))
        ).scalar_one()
    assert authored == 0
