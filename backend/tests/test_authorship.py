import pytest

ADA = {"Authorization": "Bearer test:ada@example.com"}
BOB = {"Authorization": "Bearer test:bob@example.com"}
ADA_EMAIL = "ada@example.com"
BOB_EMAIL = "bob@example.com"
AUTHORS = ("created_by", "updated_by")


def authors(record):
    return record["created_by"], record["updated_by"]


def post(client, url, body, headers=ADA):
    r = client.post(url, json=body, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def make_org(client):
    return post(client, "/api/organizations", {"name": "Acme"})


def make_deals(client, count):
    org = make_org(client)
    return [
        post(client, "/api/deals", {"name": f"D{i}", "organization_id": org["id"]})
        for i in range(count)
    ]


def test_me_returns_the_email(client):
    assert client.get("/api/me", headers=ADA).json() == {"email": ADA_EMAIL}


def test_create_sets_both_fields_on_every_kind(client):
    org = make_org(client)
    contact = post(
        client,
        "/api/contacts",
        {"first_name": "A", "last_name": "B", "organization_id": org["id"]},
    )
    deal = post(client, "/api/deals", {"name": "D", "organization_id": org["id"]})
    act = post(
        client,
        "/api/activities",
        {"type": "note", "description": "x", "deal_id": deal["id"]},
    )
    for record in (org, contact, deal, act):
        assert authors(record) == (ADA_EMAIL, ADA_EMAIL)


def test_edit_changes_updated_by_and_not_created_by(client):
    org = make_org(client)
    edited = client.patch(
        f"/api/organizations/{org['id']}", json={"notes": "hi"}, headers=BOB
    ).json()
    assert authors(edited) == (ADA_EMAIL, BOB_EMAIL)
    again = client.get(f"/api/organizations/{org['id']}", headers=ADA).json()
    assert authors(again) == (ADA_EMAIL, BOB_EMAIL)


def test_edit_contact_deal_and_activity(client):
    org = make_org(client)
    contact = post(client, "/api/contacts", {"first_name": "A", "last_name": "B"})
    deal = post(client, "/api/deals", {"name": "D", "organization_id": org["id"]})
    act = post(
        client,
        "/api/activities",
        {"type": "note", "description": "x", "deal_id": deal["id"]},
    )
    patches = [
        (f"/api/contacts/{contact['id']}", {"phone": "1"}),
        (f"/api/deals/{deal['id']}", {"value": 5}),
        (f"/api/activities/{act['id']}", {"description": "y"}),
    ]
    for url, body in patches:
        record = client.patch(url, json=body, headers=BOB).json()
        assert authors(record) == (ADA_EMAIL, BOB_EMAIL), url


@pytest.mark.parametrize("field", AUTHORS)
def test_client_cannot_send_author_fields(client, field):
    r = client.post(
        "/api/organizations", json={"name": "Acme", field: "evil@example.com"}
    )
    assert r.status_code == 422
    assert client.get("/api/organizations").json() == []


def test_client_cannot_patch_author_fields(client):
    org = make_org(client)
    r = client.patch(f"/api/organizations/{org['id']}", json={"created_by": "x@y.z"})
    assert r.status_code == 422
    assert (
        client.get(f"/api/organizations/{org['id']}").json()["created_by"] == ADA_EMAIL
    )


def test_follow_up_done_and_reopened_set_updated_by(client):
    contact = post(client, "/api/contacts", {"first_name": "A", "last_name": "B"})
    act = post(
        client,
        "/api/activities",
        {
            "type": "note",
            "description": "x",
            "contact_id": contact["id"],
            "follow_up_date": "2026-12-01",
        },
    )
    url = f"/api/activities/{act['id']}"
    done = client.patch(url, json={"follow_up_done": True}, headers=BOB).json()
    assert authors(done) == (ADA_EMAIL, BOB_EMAIL)
    reopened = client.patch(url, json={"follow_up_done": False}, headers=ADA).json()
    assert authors(reopened) == (ADA_EMAIL, ADA_EMAIL)


def test_move_sets_updated_by_on_the_moved_deal_only(client):
    first, second, third = make_deals(client, 3)
    client.post(
        f"/api/deals/{first['id']}/move",
        json={"stage": "qualified", "position": 0},
        headers=BOB,
    )
    by_id = {d["id"]: d for d in client.get("/api/deals", headers=ADA).json()}
    assert authors(by_id[first["id"]]) == (ADA_EMAIL, BOB_EMAIL)
    for neighbor in (second, third):
        assert authors(by_id[neighbor["id"]]) == (ADA_EMAIL, ADA_EMAIL)


def test_reorder_within_a_stage_sets_updated_by(client):
    first, second = make_deals(client, 2)
    client.post(
        f"/api/deals/{second['id']}/move",
        json={"stage": "new", "position": 0},
        headers=BOB,
    )
    by_id = {d["id"]: d for d in client.get("/api/deals").json()}
    assert by_id[second["id"]]["updated_by"] == BOB_EMAIL
    assert by_id[first["id"]]["updated_by"] == ADA_EMAIL


def test_stage_change_entry_is_by_the_mover(client):
    (deal,) = make_deals(client, 1)
    client.post(
        f"/api/deals/{deal['id']}/move",
        json={"stage": "won", "position": 0},
        headers=BOB,
    )
    timeline = client.get(f"/api/deals/{deal['id']}", headers=ADA).json()["timeline"]
    (entry,) = [a for a in timeline if a["type"] == "stage_change"]
    assert authors(entry) == (BOB_EMAIL, BOB_EMAIL)


def test_stage_change_through_an_edit_is_by_the_editor(client):
    (deal,) = make_deals(client, 1)
    client.patch(f"/api/deals/{deal['id']}", json={"stage": "lost"}, headers=BOB)
    timeline = client.get(f"/api/deals/{deal['id']}").json()["timeline"]
    assert timeline[0]["created_by"] == BOB_EMAIL


def test_responses_carry_both_fields(client, make):
    org = make.org()
    make.contact(org["id"])
    deal = make.deal(org["id"])
    make.activity(deal_id=deal["id"])
    records = [
        client.get("/api/organizations").json()[0],
        client.get("/api/contacts").json()[0],
        client.get("/api/deals").json()[0],
        client.get(f"/api/deals/{deal['id']}").json()["timeline"][0],
        client.get("/api/dashboard").json()["recent_activity"][0],
    ]
    for record in records:
        assert set(AUTHORS) <= record.keys()


def test_sample_data_has_no_author(seeded):
    for record in seeded.get("/api/deals").json():
        assert authors(record) == (None, None)
