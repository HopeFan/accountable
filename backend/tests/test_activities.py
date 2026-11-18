def test_create_edit_delete(client, make):
    org = make.org()
    d = make.deal(org["id"])
    a = make.activity(deal_id=d["id"], type="call", description="Rang them", follow_up_date="2026-11-20")
    assert a["deal_name"] == "Deal" and a["follow_up_state"] == "open" and a["follow_up_done"] is False
    r = client.patch(f"/api/activities/{a['id']}", json={"description": "Rang them back", "type": "email"})
    assert r.json()["description"] == "Rang them back" and r.json()["type"] == "email"
    assert client.delete(f"/api/activities/{a['id']}").status_code == 204
    assert client.get(f"/api/deals/{d['id']}").json()["timeline"] == []


def test_default_time_is_now(client, make):
    org = make.org()
    d = make.deal(org["id"])
    a = make.activity(deal_id=d["id"])
    assert a["occurred_at"] == "2026-11-17T12:00:00"


def test_needs_a_contact_or_a_deal(client):
    r = client.post("/api/activities", json={"type": "note", "description": "x"})
    assert r.status_code == 422
    r = client.post("/api/activities", json={"type": "note", "description": "x", "deal_id": 99})
    assert r.status_code == 404


def test_description_required_and_type_limited(client, make):
    c = make.contact(None)
    assert client.post("/api/activities", json={"type": "note", "description": "", "contact_id": c["id"]}).status_code == 422
    r = client.post("/api/activities", json={"type": "stage_change", "description": "x", "contact_id": c["id"]})
    assert r.status_code == 422


def test_follow_up_done_and_reopen(client, make):
    c = make.contact(None)
    a = make.activity(contact_id=c["id"], follow_up_date="2026-11-10")
    assert a["follow_up_state"] == "overdue"
    done = client.patch(f"/api/activities/{a['id']}", json={"follow_up_done": True}).json()
    assert done["follow_up_state"] == "done"
    reopened = client.patch(f"/api/activities/{a['id']}", json={"follow_up_done": False}).json()
    assert reopened["follow_up_state"] == "overdue"


def test_stage_change_entries_cannot_be_edited_but_can_be_deleted(client, make):
    org = make.org()
    d = make.deal(org["id"])
    client.post(f"/api/deals/{d['id']}/move", json={"stage": "qualified", "position": 0})
    entry = client.get(f"/api/deals/{d['id']}").json()["timeline"][0]
    assert entry["type"] == "stage_change" and entry["description"] == "Moved from New to Qualified"
    assert client.patch(f"/api/activities/{entry['id']}", json={"description": "x"}).status_code == 400
    assert client.delete(f"/api/activities/{entry['id']}").status_code == 204
    client.post(f"/api/deals/{d['id']}/move", json={"stage": "proposal", "position": 0})
    assert len(client.get(f"/api/deals/{d['id']}").json()["timeline"]) == 1
