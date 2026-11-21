import os

import pytest
from fastapi.testclient import TestClient

os.environ["ACCOUNTABLE_TODAY"] = "2026-11-17"


@pytest.fixture()
def db_file(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    monkeypatch.setenv("ACCOUNTABLE_TODAY", "2026-11-17")
    return path


@pytest.fixture()
def client(db_file):
    """An app on an empty database (no sample data)."""
    from app import db
    from app.main import app

    db.create_tables()
    return TestClient(app)


@pytest.fixture()
def seeded(db_file):
    from app import seed
    from app.main import app

    seed.reset()
    return TestClient(app)


@pytest.fixture()
def make(client):
    """Small helpers to create records."""

    class Maker:
        def org(self, name="Acme"):
            r = client.post("/api/organizations", json={"name": name})
            assert r.status_code == 201, r.text
            return r.json()

        def contact(self, org_id=None, first="Ada", last="Lovelace", **kw):
            r = client.post(
                "/api/contacts",
                json={
                    "first_name": first,
                    "last_name": last,
                    "organization_id": org_id,
                    **kw,
                },
            )
            assert r.status_code == 201, r.text
            return r.json()

        def deal(self, org_id, name="Deal", **kw):
            r = client.post(
                "/api/deals", json={"name": name, "organization_id": org_id, **kw}
            )
            assert r.status_code == 201, r.text
            return r.json()

        def activity(self, **kw):
            body = {"type": "note", "description": "Hello", **kw}
            r = client.post("/api/activities", json=body)
            assert r.status_code == 201, r.text
            return r.json()

    return Maker()
