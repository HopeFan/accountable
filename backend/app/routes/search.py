from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from .. import rules
from ..db import contact, deal, get_engine, organization

router = APIRouter(prefix="/search", tags=["search"])

LIMIT = 5
MAX_QUERY = 100
ESCAPE = "\\"


class SearchHit(BaseModel):
    id: int
    name: str
    context: str


class SearchResults(BaseModel):
    organizations: list[SearchHit]
    contacts: list[SearchHit]
    deals: list[SearchHit]


def _pattern(q: str) -> str:
    escaped = (
        q.lower()
        .replace(ESCAPE, ESCAPE * 2)
        .replace("%", ESCAPE + "%")
        .replace("_", ESCAPE + "_")
    )
    return f"%{escaped}%"


def _organizations(conn, pattern: str) -> list[SearchHit]:
    name = func.lower(organization.c.name)
    rows = conn.execute(
        select(organization.c.id, organization.c.name, organization.c.industry)
        .where(name.like(pattern, escape=ESCAPE))
        .order_by(name, organization.c.id)
        .limit(LIMIT)
    )
    return [SearchHit(id=r[0], name=r[1], context=r[2] or "") for r in rows]


def _contacts(conn, pattern: str) -> list[SearchHit]:
    first = func.lower(contact.c.first_name)
    last = func.lower(contact.c.last_name)
    full = first + " " + last
    rows = conn.execute(
        select(
            contact.c.id,
            contact.c.first_name,
            contact.c.last_name,
            organization.c.name,
        )
        .select_from(
            contact.outerjoin(
                organization, contact.c.organization_id == organization.c.id
            )
        )
        .where(
            first.like(pattern, escape=ESCAPE)
            | last.like(pattern, escape=ESCAPE)
            | full.like(pattern, escape=ESCAPE)
        )
        .order_by(full, contact.c.id)
        .limit(LIMIT)
    )
    return [SearchHit(id=r[0], name=f"{r[1]} {r[2]}", context=r[3] or "") for r in rows]


def _deals(conn, pattern: str) -> list[SearchHit]:
    name = func.lower(deal.c.name)
    rows = conn.execute(
        select(deal.c.id, deal.c.name, organization.c.name, deal.c.stage)
        .select_from(
            deal.join(organization, deal.c.organization_id == organization.c.id)
        )
        .where(name.like(pattern, escape=ESCAPE))
        .order_by(name, deal.c.id)
        .limit(LIMIT)
    )
    return [
        SearchHit(
            id=r[0],
            name=r[1],
            context=f"{r[2]} · {rules.STAGE_LABELS.get(r[3], r[3])}",
        )
        for r in rows
    ]


@router.get("", response_model=SearchResults)
def search(q: str = Query("", max_length=MAX_QUERY)):
    text = q.strip()
    if not text:
        return SearchResults(organizations=[], contacts=[], deals=[])
    pattern = _pattern(text)
    with get_engine().connect() as conn:
        return SearchResults(
            organizations=_organizations(conn, pattern),
            contacts=_contacts(conn, pattern),
            deals=_deals(conn, pattern),
        )
