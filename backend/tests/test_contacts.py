def test_crud(client, make):
    org = make.org()
    c = make.contact(org["id"], email="ada@example.com", job_title="CTO")
    assert c["status"] == "lead" and c["organization_name"] == "Acme" and c["name"] == "Ada Lovelace"
    r = client.patch(f"/api/contacts/{c['id']}", json={"status": "customer"})
    assert r.json()["status"] == "customer"
    detail = client.get(f"/api/contacts/{c['id']}").json()
    assert detail["organization"]["name"] == "Acme" and detail["deals"] == [] and detail["timeline"] == []
    assert client.delete(f"/api/contacts/{c['id']}").status_code == 204
    assert client.get("/api/contacts").json() == []


def test_required_fields_and_email(client):
    r = client.post("/api/contacts", json={"first_name": "A"})
    assert r.status_code == 422 and r.json()["detail"][0]["field"] == "last_name"
    r = client.post("/api/contacts", json={"first_name": "A", "last_name": "B", "email": "nope"})
    assert r.json()["detail"][0]["field"] == "email"


def test_contact_without_organization(client, make):
    c = make.contact(None)
    assert c["organization_id"] is None and c["organization_name"] is None
    assert client.get(f"/api/contacts/{c['id']}").json()["organization"] is None


def test_status_values(client):
    for status in ("lead", "qualified", "customer"):
        r = client.post("/api/contacts", json={"first_name": "A", "last_name": "B", "status": status})
        assert r.status_code == 201
    r = client.post("/api/contacts", json={"first_name": "A", "last_name": "B", "status": "vip"})
    assert r.status_code == 422 and r.json()["detail"][0]["field"] == "status"


def test_unknown_organization(client):
    r = client.post("/api/contacts", json={"first_name": "A", "last_name": "B", "organization_id": 99})
    assert r.status_code == 422


def test_changing_organization_clears_deals_that_no_longer_fit(client, make):
    a, b = make.org("A"), make.org("B")
    c = make.contact(a["id"])
    d = make.deal(a["id"], contact_id=c["id"])
    client.patch(f"/api/contacts/{c['id']}", json={"organization_id": b["id"]})
    assert client.get(f"/api/deals/{d['id']}").json()["contact_id"] is None
