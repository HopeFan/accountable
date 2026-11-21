"""Sign-in: who is making this request, from the bearer token."""

import os
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException

TEST_TOKEN_PREFIX = "test:"
SIGNING_ALGORITHMS = ["ES256", "RS256", "EdDSA"]


def supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", "").strip().rstrip("/")


def publishable_key() -> str:
    return os.environ.get("SUPABASE_PUBLISHABLE_KEY", "").strip()


def test_auth_enabled() -> bool:
    """The test sign-in exists for the tests only: never when Supabase is configured."""
    return (
        os.environ.get("ACCOUNTABLE_TEST_AUTH") == "1"
        and bool(os.environ.get("ACCOUNTABLE_DB"))
        and not supabase_url()
    )


def require_sign_in_settings() -> None:
    """Refuse to start rather than run with the API open."""
    if test_auth_enabled():
        return
    if not (supabase_url() and publishable_key()):
        raise RuntimeError(
            "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. The app won't run without sign-in."
        )
    if not (os.environ.get("DATABASE_URL") or os.environ.get("ACCOUNTABLE_DB")):
        raise RuntimeError(
            "Set DATABASE_URL. Without it the app would keep the team's data in a local file."
        )


def browser_config() -> dict:
    """What the page may know: the URL and the publishable key, nothing else."""
    if test_auth_enabled():
        return {"testAuth": True}
    return {
        "supabaseUrl": supabase_url(),
        "supabasePublishableKey": publishable_key(),
    }


@lru_cache
def _jwk_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json", cache_keys=True)


def unauthorized(message: str = "Not signed in") -> HTTPException:
    return HTTPException(401, detail=message, headers={"WWW-Authenticate": "Bearer"})


def _email_from_test_token(token: str) -> str:
    email = token.removeprefix(TEST_TOKEN_PREFIX).strip()
    if "@" not in email:
        raise unauthorized("Invalid token")
    return email


def _email_from_supabase_token(token: str, url: str) -> str:
    try:
        key = _jwk_client(url).get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key,
            algorithms=SIGNING_ALGORITHMS,
            audience="authenticated",
            issuer=f"{url}/auth/v1",
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
    except jwt.PyJWKClientConnectionError:
        raise HTTPException(503, detail="Sign-in service unreachable") from None
    except jwt.PyJWTError:
        raise unauthorized("Invalid token") from None
    email = claims.get("email")
    if not isinstance(email, str) or not email:
        raise unauthorized("Invalid token")
    return email


def verify_token(token: str) -> str:
    """Return the email the token was issued for, or raise 401."""
    if test_auth_enabled():
        if not token.startswith(TEST_TOKEN_PREFIX):
            raise unauthorized("Invalid token")
        return _email_from_test_token(token)
    return _email_from_supabase_token(token, supabase_url())


def current_user(authorization: Annotated[str | None, Header()] = None) -> str:
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise unauthorized()
    return verify_token(token.strip())


CurrentUser = Annotated[str, Depends(current_user)]
