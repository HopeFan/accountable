import pytest


@pytest.fixture()
def data(client, make):
    org = make.org()
    c = make.contact(org["id"])
    ids = {}
    ids["new"] = make.deal(org["id"], name="n", stage="new", value=10000)["id"]  # 5%
    ids["prop"] = make.deal(
        org["id"], name="p", stage="proposal", value=20000, contact_id=c["id"]
    )["id"]  # 40%
    ids["neg"] = make.deal(
        org["id"], name="g", stage="negotiation", value=30000, probability=50
    )["id"]
    ids["won_now"] = make.deal(
        org["id"], name="w1", stage="won", value=40000, close_date="2026-11-03"
    )["id"]
    ids["won_old"] = make.deal(
        org["id"], name="w2", stage="won", value=5000, close_date="2026-09-20"
    )["id"]
    ids["won_ancient"] = make.deal(
        org["id"], name="w3", stage="won", value=7000, close_date="2025-10-05"
    )["id"]
    ids["lost"] = make.deal(
        org["id"], name="l", stage="lost", value=9000, close_date="2026-10-01"
    )["id"]
    make.activity(deal_id=ids["prop"], follow_up_date="2026-11-10")
    make.activity(deal_id=ids["prop"], follow_up_date="2026-11-20")
    done = make.activity(deal_id=ids["new"], follow_up_date="2026-11-01")
    client.patch(f"/api/activities/{done['id']}", json={"follow_up_done": True})
    return ids, org


def test_every_figure(client, data):
    d = client.get("/api/dashboard").json()
    t = d["tiles"]
    assert d["today"] == "2026-11-17"
    assert t["open_pipeline_value"] == 60000 and t["open_deals"] == 3
    assert t["expected_revenue"] == 10000 * 0.05 + 20000 * 0.4 + 30000 * 0.5
    assert t["won_this_month_value"] == 40000 and t["won_this_month_count"] == 1
    assert t["overdue_follow_ups"] == 1

    assert (
        d["monthly"][0]["month"] == "2025-12" and d["monthly"][-1]["month"] == "2026-11"
    )
    assert len(d["monthly"]) == 12
    by_month = {m["month"]: m for m in d["monthly"]}
    assert (
        by_month["2026-11"]["revenue"] == 40000
        and by_month["2026-11"]["deals_won"] == 1
    )
    assert (
        by_month["2026-09"]["revenue"] == 5000 and by_month["2026-09"]["deals_won"] == 1
    )
    assert by_month["2026-10"]["revenue"] == 0
    assert (
        sum(m["revenue"] for m in d["monthly"]) == 45000
    )  # the Oct 2025 deal is outside the window

    funnel = {f["stage"]: f for f in d["funnel"]}
    assert funnel["new"]["value"] == 10000 + 20000 + 30000 + 40000 + 5000 + 7000
    assert funnel["qualified"]["value"] == 20000 + 30000 + 40000 + 5000 + 7000
    assert funnel["proposal"]["value"] == funnel["qualified"]["value"]
    assert funnel["negotiation"]["value"] == 30000 + 52000
    assert funnel["won"]["value"] == 52000
    assert d["lost"] == {"count": 1, "value": 9000}

    strip = {p["stage"]: p for p in d["pipeline"]}
    assert list(strip) == ["new", "qualified", "proposal", "negotiation"]
    assert (
        strip["proposal"]["count"] == 1
        and strip["proposal"]["expected_revenue"] == 8000
    )
    assert strip["qualified"]["count"] == 0

    assert [f["follow_up_state"] for f in d["follow_ups"]] == ["overdue", "open"]


def test_recent_activity_is_the_latest_ten(client, make, data):
    ids, _ = data
    for n in range(12):
        make.activity(
            deal_id=ids["new"],
            description=f"a{n}",
            occurred_at=f"2026-12-{n + 1:02d}T10:00:00",
        )
    items = client.get("/api/dashboard").json()["recent_activity"]
    assert len(items) == 10
    assert items[0]["description"] == "a11"
    assert [i["occurred_at"] for i in items] == sorted(
        (i["occurred_at"] for i in items), reverse=True
    )


def test_marking_a_deal_won_changes_the_figures(client, data):
    ids, _ = data
    before = client.get("/api/dashboard").json()
    client.post(f"/api/deals/{ids['neg']}/move", json={"stage": "won", "position": 0})
    after = client.get("/api/dashboard").json()
    assert (
        after["tiles"]["open_pipeline_value"]
        == before["tiles"]["open_pipeline_value"] - 30000
    )
    assert (
        after["tiles"]["won_this_month_value"] == 70000
        and after["tiles"]["won_this_month_count"] == 2
    )
    assert after["monthly"][-1]["revenue"] == 70000
    assert after["recent_activity"][0]["description"] == "Moved from Negotiation to Won"
    funnel = {f["stage"]: f["value"] for f in after["funnel"]}
    assert funnel["won"] == 82000


def test_new_follow_up_shows_up(client, make, data):
    ids, _ = data
    make.activity(deal_id=ids["new"], follow_up_date="2026-11-30")
    d = client.get("/api/dashboard").json()
    assert (
        len(d["follow_ups"]) == 3
        and d["follow_ups"][-1]["follow_up_date"] == "2026-11-30"
    )
