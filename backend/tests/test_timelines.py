def test_deal_timeline_is_newest_first(client, make):
    org = make.org()
    d = make.deal(org["id"])
    for when, text in (("2026-11-01T09:00:00", "old"), ("2026-11-10T09:00:00", "newer"), ("2026-11-05T09:00:00", "middle")):
        make.activity(deal_id=d["id"], description=text, occurred_at=when)
    texts = [a["description"] for a in client.get(f"/api/deals/{d['id']}").json()["timeline"]]
    assert texts == ["newer", "middle", "old"]


def test_contact_timeline_includes_activities_on_their_deals(client, make):
    org = make.org()
    c, other = make.contact(org["id"]), make.contact(org["id"], first="B", last="B")
    d = make.deal(org["id"], contact_id=c["id"])
    od = make.deal(org["id"], contact_id=other["id"])
    make.activity(contact_id=c["id"], description="direct", occurred_at="2026-11-02T09:00:00")
    make.activity(deal_id=d["id"], description="on deal", occurred_at="2026-11-09T09:00:00")
    make.activity(deal_id=od["id"], description="not mine", occurred_at="2026-11-12T09:00:00")
    client.post(f"/api/deals/{d['id']}/move", json={"stage": "qualified", "position": 0})
    texts = [a["description"] for a in client.get(f"/api/contacts/{c['id']}").json()["timeline"]]
    assert texts == ["Moved from New to Qualified", "on deal", "direct"]
