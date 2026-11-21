def test_open_follow_ups_overdue_first_then_by_date(client, make):
    c = make.contact(None)
    later = make.activity(contact_id=c["id"], follow_up_date="2026-11-25")
    soon = make.activity(contact_id=c["id"], follow_up_date="2026-11-18")
    overdue = make.activity(contact_id=c["id"], follow_up_date="2026-11-10")
    make.activity(contact_id=c["id"])  # no follow-up
    ups = client.get("/api/follow-ups").json()
    assert [u["id"] for u in ups] == [overdue["id"], soon["id"], later["id"]]
    assert [u["follow_up_state"] for u in ups] == ["overdue", "open", "open"]


def test_done_follow_up_disappears(client, make):
    c = make.contact(None)
    a = make.activity(contact_id=c["id"], follow_up_date="2026-11-18")
    client.patch(f"/api/activities/{a['id']}", json={"follow_up_done": True})
    assert client.get("/api/follow-ups").json() == []
    client.patch(f"/api/activities/{a['id']}", json={"follow_up_done": False})
    assert len(client.get("/api/follow-ups").json()) == 1
