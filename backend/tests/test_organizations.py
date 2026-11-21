def test_crud(client):
    r = client.post(
        "/api/organizations",
        json={"name": "Acme", "industry": "Retail", "website": " acme.example "},
    )
    assert r.status_code == 201
    org = r.json()
    assert org["website"] == "acme.example" and org["contacts_count"] == 0
    assert client.get(f"/api/organizations/{org['id']}").json()["name"] == "Acme"
    r = client.patch(f"/api/organizations/{org['id']}", json={"industry": "Finance"})
    assert r.json()["industry"] == "Finance" and r.json()["name"] == "Acme"
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert client.get(f"/api/organizations/{org['id']}").status_code == 404
    assert client.get("/api/organizations").json() == []


def test_name_is_required(client):
    r = client.post("/api/organizations", json={"name": "  "})
    assert r.status_code == 422 and r.json()["detail"][0]["field"] == "name"
    r = client.post("/api/organizations", json={})
    assert r.status_code == 422


def test_names_are_unique_ignoring_case(client):
    client.post("/api/organizations", json={"name": "Acme"})
    r = client.post("/api/organizations", json={"name": "ACME"})
    assert r.status_code == 422 and r.json()["detail"][0]["field"] == "name"
    other = client.post("/api/organizations", json={"name": "Other"}).json()
    r = client.patch(f"/api/organizations/{other['id']}", json={"name": "acme"})
    assert r.status_code == 422
    assert (
        client.patch(
            f"/api/organizations/{other['id']}", json={"name": "Other"}
        ).status_code
        == 200
    )


def test_list_counts_and_detail(client, make):
    org = make.org()
    make.contact(org["id"])
    make.contact(org["id"], first="Bo", last="Zed")
    make.deal(org["id"], value=1000)
    make.deal(org["id"], value=500, stage="proposal")
    make.deal(org["id"], value=9000, stage="won")
    row = client.get("/api/organizations").json()[0]
    assert (
        row["contacts_count"],
        row["open_deals_count"],
        row["open_deals_value"],
    ) == (2, 2, 1500)
    detail = client.get(f"/api/organizations/{org['id']}").json()
    assert len(detail["contacts"]) == 2 and len(detail["deals"]) == 3
