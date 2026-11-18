from sqlalchemy import func, select

from app import db


def count(table):
    with db.get_engine().connect() as conn:
        return conn.execute(select(func.count()).select_from(table)).scalar_one()


def totals():
    return {t.name: count(t) for t in (db.organization, db.contact, db.deal, db.activity)}


def build(make):
    org = make.org("Target")
    other = make.org("Other")
    c1, c2 = make.contact(org["id"]), make.contact(org["id"], first="B", last="B")
    oc = make.contact(other["id"], first="O", last="O")
    d1, d2 = make.deal(org["id"], contact_id=c1["id"]), make.deal(org["id"])
    od = make.deal(other["id"], contact_id=oc["id"])
    make.activity(contact_id=c1["id"])
    make.activity(deal_id=d1["id"])
    make.activity(deal_id=d1["id"], contact_id=c1["id"])
    make.activity(deal_id=d2["id"])
    make.activity(deal_id=od["id"])
    make.activity(contact_id=oc["id"])
    return org, c1, d1, other, od


def test_delete_organization_removes_everything_linked(client, make):
    org, *_ = build(make)
    before = totals()
    preview = client.get(f"/api/organizations/{org['id']}/delete-preview").json()
    assert preview == {"contacts": 2, "deals": 2, "activities": 4, "deals_kept": 0}
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    after = totals()
    assert before["organization"] - after["organization"] == 1
    assert before["contact"] - after["contact"] == preview["contacts"]
    assert before["deal"] - after["deal"] == preview["deals"]
    assert before["activity"] - after["activity"] == preview["activities"]
    assert after == {"organization": 1, "contact": 1, "deal": 1, "activity": 2}


def test_delete_contact_keeps_deals(client, make):
    org, c1, d1, *_ = build(make)
    before = totals()
    preview = client.get(f"/api/contacts/{c1['id']}/delete-preview").json()
    assert preview == {"contacts": 0, "deals": 0, "activities": 2, "deals_kept": 1}
    client.delete(f"/api/contacts/{c1['id']}")
    after = totals()
    assert before["contact"] - after["contact"] == 1
    assert before["activity"] - after["activity"] == preview["activities"]
    assert after["deal"] == before["deal"]
    assert client.get(f"/api/deals/{d1['id']}").json()["contact_id"] is None


def test_delete_deal_removes_its_activities(client, make):
    org, c1, d1, *_ = build(make)
    before = totals()
    preview = client.get(f"/api/deals/{d1['id']}/delete-preview").json()
    assert preview["activities"] == 2
    client.delete(f"/api/deals/{d1['id']}")
    after = totals()
    assert before["deal"] - after["deal"] == 1
    assert before["activity"] - after["activity"] == preview["activities"]
    assert after["contact"] == before["contact"]


def test_deleting_a_deal_keeps_positions_consecutive(client, make):
    org = make.org()
    ids = [make.deal(org["id"])["id"] for _ in range(4)]
    client.delete(f"/api/deals/{ids[1]}")
    positions = sorted(d["position"] for d in client.get("/api/deals").json())
    assert positions == [0, 1, 2]


def test_delete_missing_records(client):
    for kind in ("organizations", "contacts", "deals"):
        assert client.delete(f"/api/{kind}/99").status_code == 404
        assert client.get(f"/api/{kind}/99/delete-preview").status_code == 404
