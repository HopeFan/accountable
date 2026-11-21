import os

import pytest
from fastapi.testclient import TestClient

os.environ["ACCOUNTABLE_TODAY"] = "2026-11-17"
SIGNED_IN = {"Authorization": "Bearer test:tester@example.com"}


@pytest.fixture(autouse=True)
def no_real_settings(monkeypatch):
    """Nothing in the shell can send a test to Supabase or switch test sign-in on."""
    for name in (
        "DATABASE_URL",
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
        "ACCOUNTABLE_TEST_AUTH",
    ):
        monkeypatch.delenv(name, raising=False)


@pytest.fixture()
def db_file(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    monkeypatch.setenv("ACCOUNTABLE_TODAY", "2026-11-17")
    return path


@pytest.fixture()
def client(db_file, monkeypatch):
    """A signed-in app on an empty database (no sample data)."""
    from app import db
    from app.main import app

    db.create_tables()
    monkeypatch.setenv("ACCOUNTABLE_TEST_AUTH", "1")
    return TestClient(app, headers=SIGNED_IN)


@pytest.fixture()
def signed_out(client):
    """The same app and database, with no token."""
    from app.main import app

    return TestClient(app)


@pytest.fixture()
def seeded(db_file, monkeypatch):
    from app import seed
    from app.main import app

    seed.reset()
    monkeypatch.setenv("ACCOUNTABLE_TEST_AUTH", "1")
    return TestClient(app, headers=SIGNED_IN)


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
