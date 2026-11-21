def test_create_takes_probability_of_stage(client, make):
    org = make.org()
    assert make.deal(org["id"], stage="proposal")["probability"] == 40
    assert make.deal(org["id"])["probability"] == 5
    assert (
        make.deal(org["id"], stage="negotiation", probability=55)["probability"] == 55
    )


def test_stage_change_resets_probability(client, make):
    org = make.org()
    d = make.deal(org["id"], stage="proposal", probability=55)
    r = client.patch(f"/api/deals/{d['id']}", json={"stage": "negotiation"})
    assert r.json()["probability"] == 70


def test_hand_set_probability_stays_until_stage_changes(client, make):
    org = make.org()
    d = make.deal(org["id"], stage="proposal")
    r = client.patch(
        f"/api/deals/{d['id']}", json={"probability": 55, "name": "Renamed"}
    )
    assert r.json()["probability"] == 55 and r.json()["stage"] == "proposal"
    # an edit form sends every field again; the unchanged probability doesn't block the reset
    r = client.patch(
        f"/api/deals/{d['id']}", json={"probability": 55, "stage": "negotiation"}
    )
    assert r.json()["probability"] == 70
    # a probability edited in the same request as the stage change is kept
    r = client.patch(
        f"/api/deals/{d['id']}", json={"probability": 66, "stage": "proposal"}
    )
    assert r.json()["probability"] == 66


def test_won_and_lost_set_close_date_to_today(client, make):
    org = make.org()
    for stage, prob in (("won", 100), ("lost", 0)):
        d = make.deal(org["id"], stage="proposal", close_date="2027-02-01")
        r = client.patch(f"/api/deals/{d['id']}", json={"stage": stage}).json()
        assert r["close_date"] == "2026-11-17" and r["probability"] == prob


def test_moving_to_an_open_stage_keeps_close_date(client, make):
    org = make.org()
    d = make.deal(org["id"], close_date="2027-02-01")
    r = client.patch(f"/api/deals/{d['id']}", json={"stage": "qualified"}).json()
    assert r["close_date"] == "2027-02-01"


def test_contact_from_another_organization_is_refused(client, make):
    a, b = make.org("A"), make.org("B")
    c = make.contact(b["id"])
    r = client.post(
        "/api/deals",
        json={"name": "X", "organization_id": a["id"], "contact_id": c["id"]},
    )
    assert r.status_code == 422
    assert r.json()["detail"][0]["field"] == "contact_id"
    d = make.deal(a["id"])
    r = client.patch(f"/api/deals/{d['id']}", json={"contact_id": c["id"]})
    assert r.status_code == 422


def test_contact_must_follow_into_new_organization(client, make):
    a, b = make.org("A"), make.org("B")
    c = make.contact(a["id"])
    d = make.deal(a["id"], contact_id=c["id"])
    r = client.patch(f"/api/deals/{d['id']}", json={"organization_id": b["id"]})
    assert r.status_code == 422


def test_deal_is_late_flag(client, make):
    org = make.org()
    late = make.deal(org["id"], close_date="2026-11-16")
    fine = make.deal(org["id"], close_date="2026-11-17")
    won = make.deal(org["id"], stage="won", close_date="2026-10-01")
    by_id = {d["id"]: d for d in client.get("/api/deals").json()}
    assert (
        by_id[late["id"]]["is_late"]
        and not by_id[fine["id"]]["is_late"]
        and not by_id[won["id"]]["is_late"]
    )


def test_validation_errors_name_the_field(client, make):
    org = make.org()
    r = client.post("/api/deals", json={"organization_id": org["id"], "name": ""})
    assert r.status_code == 422 and r.json()["detail"][0]["field"] == "name"
    r = client.post(
        "/api/deals", json={"organization_id": org["id"], "name": "X", "value": -1}
    )
    assert r.json()["detail"][0]["field"] == "value"
    r = client.post(
        "/api/deals",
        json={"organization_id": org["id"], "name": "X", "probability": 101},
    )
    assert r.json()["detail"][0]["field"] == "probability"
    r = client.post("/api/deals", json={"organization_id": 999, "name": "X"})
    assert r.json()["detail"][0]["field"] == "organization_id"


def test_missing_deal_is_404(client):
    assert client.get("/api/deals/999").status_code == 404
