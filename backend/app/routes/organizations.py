from fastapi import APIRouter, Response
from sqlalchemy import func, insert, select, update

from .. import clock, rules
from ..common import (
    all_deals,
    execute_delete,
    field_error,
    get_or_404,
    plan_delete,
    preview,
    serialize_contact,
    serialize_organization,
)
from ..db import contact, deal, get_engine, organization
from ..schemas import OrganizationIn, OrganizationPatch

router = APIRouter(prefix="/organizations", tags=["organizations"])


def _check_unique(conn, name: str, exclude_id: int | None = None) -> None:
    q = select(organization.c.id).where(func.lower(organization.c.name) == name.lower())
    if exclude_id is not None:
        q = q.where(organization.c.id != exclude_id)
    if conn.execute(q).first():
        raise field_error("name", "An organization with this name already exists")


def _with_counts(conn, rows) -> list[dict]:
    contacts = dict(
        conn.execute(
            select(contact.c.organization_id, func.count()).group_by(contact.c.organization_id)
        ).all()
    )
    open_deals: dict[int, list[int]] = {}
    for r in conn.execute(
        select(deal.c.organization_id, deal.c.value).where(deal.c.stage.in_(rules.OPEN_STAGES))
    ):
        open_deals.setdefault(r[0], []).append(r[1])
    out = []
    for r in rows:
        d = serialize_organization(r)
        d["contacts_count"] = contacts.get(r["id"], 0)
        d["open_deals_count"] = len(open_deals.get(r["id"], []))
        d["open_deals_value"] = sum(open_deals.get(r["id"], []))
        out.append(d)
    return out


@router.get("")
def list_organizations():
    with get_engine().connect() as conn:
        rows = conn.execute(select(organization).order_by(func.lower(organization.c.name))).mappings().all()
        return _with_counts(conn, rows)


@router.post("", status_code=201)
def create_organization(body: OrganizationIn):
    with get_engine().begin() as conn:
        _check_unique(conn, body.name)
        new_id = conn.execute(insert(organization).values(**body.model_dump())).inserted_primary_key[0]
        row = get_or_404(conn, organization, new_id, "Organization")
        return _with_counts(conn, [row])[0]


@router.get("/{org_id}")
def get_organization(org_id: int):
    with get_engine().connect() as conn:
        row = get_or_404(conn, organization, org_id, "Organization")
        out = _with_counts(conn, [row])[0]
        contacts = conn.execute(
            select(contact).where(contact.c.organization_id == org_id).order_by(contact.c.last_name, contact.c.first_name)
        ).mappings()
        out["contacts"] = [serialize_contact(c, row["name"]) for c in contacts]
        out["deals"] = all_deals(conn, deal.c.organization_id == org_id)
        out["today"] = clock.today().isoformat()
        return out


@router.patch("/{org_id}")
def update_organization(org_id: int, body: OrganizationPatch):
    changes = body.model_dump(exclude_unset=True)
    if "name" in changes and changes["name"] is None:
        raise field_error("name", "Name is required")
    with get_engine().begin() as conn:
        get_or_404(conn, organization, org_id, "Organization")
        if "name" in changes:
            _check_unique(conn, changes["name"], org_id)
        if changes:
            conn.execute(update(organization).where(organization.c.id == org_id).values(**changes))
        row = get_or_404(conn, organization, org_id, "Organization")
        return _with_counts(conn, [row])[0]


@router.get("/{org_id}/delete-preview")
def delete_preview(org_id: int):
    with get_engine().connect() as conn:
        return preview(plan_delete(conn, "organization", org_id), "organization")


@router.delete("/{org_id}", status_code=204)
def delete_organization(org_id: int):
    with get_engine().begin() as conn:
        plan = plan_delete(conn, "organization", org_id)
        execute_delete(conn, "organization", org_id, plan)
    return Response(status_code=204)
