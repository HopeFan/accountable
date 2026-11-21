from fastapi import APIRouter, Response
from sqlalchemy import select, update

from .. import clock
from ..auth import CurrentUser
from ..common import (
    activities,
    all_deals,
    clear_deal_contact,
    execute_delete,
    field_error,
    get_or_404,
    insert_row,
    plan_delete,
    preview,
    serialize_contact,
)
from ..db import activity, contact, deal, get_engine, organization, write_lock
from ..schemas import ContactIn, ContactPatch

router = APIRouter(prefix="/contacts", tags=["contacts"])


def _org_name(conn, org_id: int | None) -> str | None:
    if org_id is None:
        return None
    row = conn.execute(
        select(organization.c.name).where(organization.c.id == org_id)
    ).first()
    if row is None:
        raise field_error("organization_id", "This organization doesn't exist")
    return row[0]


def _one(conn, contact_id: int) -> dict:
    row = get_or_404(conn, contact, contact_id, "Contact")
    return serialize_contact(row, _org_name(conn, row["organization_id"]))


@router.get("")
def list_contacts():
    with get_engine().connect() as conn:
        q = (
            select(contact, organization.c.name.label("org_name"))
            .select_from(
                contact.outerjoin(
                    organization, contact.c.organization_id == organization.c.id
                )
            )
            .order_by(contact.c.last_name, contact.c.first_name)
        )
        return [serialize_contact(r, r["org_name"]) for r in conn.execute(q).mappings()]


@router.post("", status_code=201)
def create_contact(body: ContactIn, user: CurrentUser):
    with get_engine().begin() as conn:
        _org_name(conn, body.organization_id)
        new_id = insert_row(conn, contact, body.model_dump(), user)
        return _one(conn, new_id)


@router.get("/{contact_id}")
def get_contact(contact_id: int):
    with get_engine().connect() as conn:
        out = _one(conn, contact_id)
        out["organization"] = None
        if out["organization_id"]:
            org = get_or_404(conn, organization, out["organization_id"], "Organization")
            out["organization"] = {"id": org["id"], "name": org["name"]}
        out["deals"] = all_deals(conn, deal.c.contact_id == contact_id)
        deal_ids = [d["id"] for d in out["deals"]]
        cond = activity.c.contact_id == contact_id
        if deal_ids:
            cond = cond | activity.c.deal_id.in_(deal_ids)
        out["timeline"] = activities(conn, cond)
        out["today"] = clock.today().isoformat()
        return out


@router.patch("/{contact_id}")
def update_contact(contact_id: int, body: ContactPatch, user: CurrentUser):
    changes = body.model_dump(exclude_unset=True)
    for f in ("first_name", "last_name", "status"):
        if f in changes and changes[f] is None:
            raise field_error(f, "This field is required")
    with get_engine().begin() as conn:
        current = get_or_404(conn, contact, contact_id, "Contact")
        if "organization_id" in changes:
            _org_name(conn, changes["organization_id"])
        if changes:
            conn.execute(
                update(contact)
                .where(contact.c.id == contact_id)
                .values(**changes, updated_by=user)
            )
        new_org = changes.get("organization_id", current["organization_id"])
        if new_org != current["organization_id"]:
            # a deal's contact must work at the deal's organization
            clear_deal_contact(
                conn,
                (deal.c.contact_id == contact_id) & (deal.c.organization_id != new_org),
                user,
            )
        return _one(conn, contact_id)


@router.get("/{contact_id}/delete-preview")
def delete_preview(contact_id: int):
    with get_engine().connect() as conn:
        return preview(plan_delete(conn, "contact", contact_id), "contact")


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, user: CurrentUser):
    with write_lock, get_engine().begin() as conn:
        plan = plan_delete(conn, "contact", contact_id)
        clear_deal_contact(conn, deal.c.contact_id == contact_id, user)
        execute_delete(conn, "contact", contact_id, plan)
    return Response(status_code=204)
