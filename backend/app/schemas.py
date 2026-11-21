"""Pydantic models for requests."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Stage = Literal["new", "qualified", "proposal", "negotiation", "won", "lost"]
ContactStatus = Literal["lead", "qualified", "customer"]
ActivityType = Literal["note", "call", "email"]


def _clean(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return v or None


class Base(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OrganizationIn(Base):
    name: str = Field(min_length=1, max_length=200)
    website: str | None = Field(default=None, max_length=300)
    industry: str | None = Field(default=None, max_length=100)
    notes: str | None = None

    _c = field_validator("website", "industry", "notes")(_clean)


class OrganizationPatch(Base):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    website: str | None = Field(default=None, max_length=300)
    industry: str | None = Field(default=None, max_length=100)
    notes: str | None = None

    _c = field_validator("website", "industry", "notes")(_clean)


def _email(v: str | None) -> str | None:
    v = _clean(v)
    if v is not None and (
        "@" not in v
        or v.startswith("@")
        or v.endswith("@")
        or " " in v
        or "." not in v.split("@")[-1]
    ):
        raise ValueError("Enter a valid email address")
    return v


class ContactIn(Base):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str | None = None
    phone: str | None = Field(default=None, max_length=50)
    job_title: str | None = Field(default=None, max_length=150)
    organization_id: int | None = None
    status: ContactStatus = "lead"

    _e = field_validator("email")(_email)
    _c = field_validator("phone", "job_title")(_clean)


class ContactPatch(Base):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = None
    phone: str | None = Field(default=None, max_length=50)
    job_title: str | None = Field(default=None, max_length=150)
    organization_id: int | None = None
    status: ContactStatus | None = None

    _e = field_validator("email")(_email)
    _c = field_validator("phone", "job_title")(_clean)


class DealIn(Base):
    name: str = Field(min_length=1, max_length=200)
    organization_id: int
    contact_id: int | None = None
    stage: Stage = "new"
    value: int = Field(default=0, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    close_date: date | None = None
    position: int | None = Field(default=None, ge=0)


class DealPatch(Base):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    organization_id: int | None = None
    contact_id: int | None = None
    stage: Stage | None = None
    value: int | None = Field(default=None, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    close_date: date | None = None


class MoveIn(Base):
    stage: Stage
    position: int = Field(ge=0)


class ActivityIn(Base):
    type: ActivityType
    contact_id: int | None = None
    deal_id: int | None = None
    description: str = Field(min_length=1)
    occurred_at: datetime | None = None
    follow_up_date: date | None = None


class ActivityPatch(Base):
    type: ActivityType | None = None
    description: str | None = Field(default=None, min_length=1)
    occurred_at: datetime | None = None
    follow_up_date: date | None = None
    follow_up_done: bool | None = None
