import re
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app import auth
from app.main import app

URL = "https://project.supabase.co"
ISSUER = f"{URL}/auth/v1"


@pytest.fixture(scope="module")
def key():
    return ec.generate_private_key(ec.SECP256R1())


class FakeJwks:
    def __init__(self, public_key):
        self.public_key = public_key

    def get_signing_key_from_jwt(self, _token):
        return type("SigningKey", (), {"key": self.public_key})()


@pytest.fixture()
def real_mode(monkeypatch, key):
    """Supabase settings present, and the key set answers from memory, not the network."""
    monkeypatch.setenv("SUPABASE_URL", URL)
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x")
    monkeypatch.setattr(auth, "_jwk_client", lambda _url: FakeJwks(key.public_key()))


@pytest.fixture()
def real_client(db_file, real_mode):
    from app import db

    db.create_tables()
    return TestClient(app)


def make_token(key, **overrides):
    claims = {
        "sub": "user-1",
        "email": "ada@example.com",
        "aud": "authenticated",
        "iss": ISSUER,
        "exp": int(time.time()) + 600,
    } | overrides
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, key, algorithm="ES256")


def me(client, token):
    return client.get("/api/me", headers={"Authorization": f"Bearer {token}"})


def test_valid_token_gives_its_email(real_client, key):
    r = me(real_client, make_token(key))
    assert r.status_code == 200
    assert r.json() == {"email": "ada@example.com"}


@pytest.mark.parametrize(
    "overrides",
    [
        {"exp": int(time.time()) - 60},
        {"aud": "anon"},
        {"iss": "https://evil.example/auth/v1"},
        {"email": None},
        {"exp": None},
    ],
    ids=["expired", "wrong-audience", "wrong-issuer", "no-email", "no-expiry"],
)
def test_bad_claims_are_refused(real_client, key, overrides):
    assert me(real_client, make_token(key, **overrides)).status_code == 401


def test_wrongly_signed_token_is_refused(real_client):
    other = ec.generate_private_key(ec.SECP256R1())
    assert me(real_client, make_token(other)).status_code == 401


@pytest.mark.parametrize("token", ["not-a-token", "a.b.c", "test:ada@example.com"])
def test_malformed_token_is_refused(real_client, token):
    assert me(real_client, token).status_code == 401


@pytest.mark.parametrize(
    "header", [None, "", "Bearer", "Bearer  ", "Basic abc", "token-without-scheme"]
)
def test_missing_or_oddly_formed_header_is_refused(real_client, header):
    headers = {} if header is None else {"Authorization": header}
    r = real_client.get("/api/me", headers=headers)
    assert r.status_code == 401
    assert r.headers["www-authenticate"] == "Bearer"


def test_unreachable_key_service_is_not_a_sign_out(real_client, monkeypatch, key):
    def unreachable(_token):
        raise jwt.PyJWKClientConnectionError("down")

    down = type("Down", (), {"get_signing_key_from_jwt": staticmethod(unreachable)})()
    monkeypatch.setattr(auth, "_jwk_client", lambda _url: down)
    assert me(real_client, make_token(key)).status_code == 503


def api_routes():
    """Every method and path under /api, as the app itself documents them."""
    return [
        (method.upper(), path)
        for path, operations in app.openapi()["paths"].items()
        if path.startswith("/api")
        for method in operations
    ]


def test_every_api_route_refuses_without_a_token(signed_out):
    routes = api_routes()
    assert len(routes) > 20
    for method, path in routes:
        r = signed_out.request(method, re.sub(r"\{[^}]+\}", "1", path))
        assert r.status_code == 401, (method, path, r.status_code)


def test_public_routes_need_no_token(signed_out):
    assert signed_out.get("/healthz").json() == {"status": "ok"}
    assert signed_out.get("/config.json").status_code == 200


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
def test_api_documentation_is_not_public(signed_out, path):
    r = signed_out.get(path)
    assert "openapi" not in r.text and "paths" not in r.text


def test_config_shows_only_the_url_and_publishable_key(real_client, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://secret")
    assert real_client.get("/config.json").json() == {
        "supabaseUrl": URL,
        "supabasePublishableKey": "sb_publishable_x",
    }


def test_config_in_test_mode(signed_out):
    assert signed_out.get("/config.json").json() == {"testAuth": True}


def test_test_token_is_accepted_in_test_mode(client):
    assert client.get("/api/me").json() == {"email": "tester@example.com"}


@pytest.mark.parametrize("token", ["ada@example.com", "test:", "test:not-an-email"])
def test_bad_test_tokens_are_refused(client, token):
    assert me(client, token).status_code == 401


def test_test_sign_in_needs_the_switch(client, monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_TEST_AUTH")
    assert not auth.test_auth_enabled()


def test_test_sign_in_needs_a_test_database(client, monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_DB")
    assert not auth.test_auth_enabled()


def test_test_sign_in_is_ignored_when_supabase_is_set(client, monkeypatch, key):
    monkeypatch.setenv("SUPABASE_URL", URL)
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x")
    monkeypatch.setattr(auth, "_jwk_client", lambda _url: FakeJwks(key.public_key()))
    assert not auth.test_auth_enabled()
    assert me(client, "test:ada@example.com").status_code == 401
    assert me(client, make_token(key)).status_code == 200


def test_app_refuses_to_start_without_settings_or_switch(db_file):
    with pytest.raises(RuntimeError, match="SUPABASE_URL"), TestClient(app):
        pass


def test_app_refuses_to_start_with_half_the_settings(db_file, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", URL)
    with pytest.raises(RuntimeError):
        auth.require_sign_in_settings()


def test_app_refuses_to_start_without_a_database_setting(real_mode, monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_DB", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        auth.require_sign_in_settings()


def test_app_starts_with_a_database_url(real_mode, monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_DB", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql://nobody@127.0.0.1:1/none")
    auth.require_sign_in_settings()


def test_test_mode_needs_no_database_url(client):
    auth.require_sign_in_settings()


def test_app_starts_with_the_settings(db_file, real_mode):
    with TestClient(app) as started:
        assert started.get("/healthz").status_code == 200


def test_unreachable_database_url_does_not_affect_tests(client, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://nobody@127.0.0.1:1/none")
    assert client.get("/api/organizations").status_code == 200
