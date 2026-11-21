"""Shared helpers: row serialisation, delete plans, errors."""

from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy import Connection, delete, func, insert, or_, select, update

from . import clock, rules
from .db import AUTHOR_COLUMNS, activity, contact, deal, organization


def insert_row(conn: Connection, table, values: dict, user: str) -> int:
    authored = {**values, "created_by": user, "updated_by": user}
    pk = conn.execute(insert(table).values(**authored)).inserted_primary_key
    if pk is None:
        raise RuntimeError(f"Insert into {table.name} returned no primary key")
    return pk[0]


def field_error(field: str, message: str, status: int = 422) -> HTTPException:
    return HTTPException(status, detail=[{"field": field, "message": message}])


def not_found(what: str) -> HTTPException:
    return HTTPException(404, detail=f"{what} not found")


def get_or_404(conn: Connection, table, id_: int, what: str):
    row = conn.execute(select(table).where(table.c.id == id_)).mappings().first()
    if row is None:
        raise not_found(what)
    return row


def iso(v):
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


def contact_name(row) -> str:
    return f"{row['first_name']} {row['last_name']}"


def serialize_organization(row) -> dict:
    return {
        k: row[k]
        for k in ("id", "name", "website", "industry", "notes", *AUTHOR_COLUMNS)
    }


def serialize_contact(row, org_name: str | None = None) -> dict:
    d = {
        k: row[k]
        for k in (
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "job_title",
            "organization_id",
            "status",
            *AUTHOR_COLUMNS,
        )
    }
    d["name"] = contact_name(row)
    d["organization_name"] = org_name
    return d


def serialize_deal(row, org_name: str, contact_nm: str | None, today: date) -> dict:
    d = {
        k: iso(row[k])
        for k in (
            "id",
            "name",
            "organization_id",
            "contact_id",
            "stage",
            "value",
            "probability",
            "close_date",
            "position",
            *AUTHOR_COLUMNS,
        )
    }
    d["organization_name"] = org_name
    d["contact_name"] = contact_nm
    d["is_late"] = rules.is_late(row["stage"], row["close_date"], today)
    d["expected_revenue"] = rules.expected_revenue(
        row["stage"], row["value"], row["probability"]
    )
    return d


def serialize_activity(
    row, deal_name: str | None, contact_nm: str | None, today: date
) -> dict:
    d = {
        k: iso(row[k])
        for k in (
            "id",
            "type",
            "contact_id",
            "deal_id",
            "description",
            "occurred_at",
            "follow_up_date",
            "follow_up_done",
            *AUTHOR_COLUMNS,
        )
    }
    d["follow_up_state"] = rules.follow_up_state(
        row["follow_up_date"], row["follow_up_done"], today
    )
    d["deal_name"] = deal_name
    d["contact_name"] = contact_nm
    return d


def all_deals(conn: Connection, where=None) -> list[dict]:
    today = clock.today()
    j = deal.join(organization, deal.c.organization_id == organization.c.id).outerjoin(
        contact, deal.c.contact_id == contact.c.id
    )
    q = select(
        deal,
        organization.c.name.label("org_name"),
        contact.c.first_name.label("c_first"),
        contact.c.last_name.label("c_last"),
    ).select_from(j)
    if where is not None:
        q = q.where(where)
    q = q.order_by(deal.c.stage, deal.c.position, deal.c.id)
    out = []
    for r in conn.execute(q).mappings():
        nm = f"{r['c_first']} {r['c_last']}" if r["c_first"] else None
        out.append(serialize_deal(r, r["org_name"], nm, today))
    return out


def activities(conn: Connection, where, limit: int | None = None) -> list[dict]:
    today = clock.today()
    c_alias = contact.alias("ac")
    j = activity.outerjoin(deal, activity.c.deal_id == deal.c.id).outerjoin(
        c_alias, activity.c.contact_id == c_alias.c.id
    )
    q = (
        select(
            activity,
            deal.c.name.label("deal_name"),
            c_alias.c.first_name.label("c_first"),
            c_alias.c.last_name.label("c_last"),
        )
        .select_from(j)
        .where(where)
        .order_by(activity.c.occurred_at.desc(), activity.c.id.desc())
    )
    if limit:
        q = q.limit(limit)
    out = []
    for r in conn.execute(q).mappings():
        nm = f"{r['c_first']} {r['c_last']}" if r["c_first"] else None
        out.append(serialize_activity(r, r["deal_name"], nm, today))
    return out


# ---- delete plans: the preview and the delete use the same code -------------


def plan_delete(conn: Connection, kind: str, id_: int) -> dict:
    """Return ids of everything that goes when this record is deleted."""
    if kind == "organization":
        get_or_404(conn, organization, id_, "Organization")
        contact_ids = [
            r[0]
            for r in conn.execute(
                select(contact.c.id).where(contact.c.organization_id == id_)
            )
        ]
        deal_ids = [
            r[0]
            for r in conn.execute(
                select(deal.c.id).where(deal.c.organization_id == id_)
            )
        ]
    elif kind == "contact":
        get_or_404(conn, contact, id_, "Contact")
        contact_ids, deal_ids = [id_], []
    elif kind == "deal":
        get_or_404(conn, deal, id_, "Deal")
        contact_ids, deal_ids = [], [id_]
    else:  # pragma: no cover
        raise ValueError(kind)
    conds = []
    if contact_ids:
        conds.append(activity.c.contact_id.in_(contact_ids))
    if deal_ids:
        conds.append(activity.c.deal_id.in_(deal_ids))
    activity_ids = (
        [r[0] for r in conn.execute(select(activity.c.id).where(or_(*conds)))]
        if conds
        else []
    )
    kept = count_where(conn, deal, deal.c.contact_id == id_) if kind == "contact" else 0
    return {
        "contacts": contact_ids,
        "deals": deal_ids,
        "activities": activity_ids,
        "kept": kept,
    }


def preview(plan: dict, kind: str) -> dict:
    return {
        "contacts": len(plan["contacts"]) if kind == "organization" else 0,
        "deals": len(plan["deals"]) if kind == "organization" else 0,
        "activities": len(plan["activities"]),
        "deals_kept": plan["kept"],
    }


def clear_deal_contact(conn: Connection, where, user: str) -> None:
    """Take a contact off the deals matching `where`, and record who did it."""
    conn.execute(update(deal).where(where).values(contact_id=None, updated_by=user))


def execute_delete(conn: Connection, kind: str, id_: int, plan: dict) -> None:
    if plan["activities"]:
        conn.execute(delete(activity).where(activity.c.id.in_(plan["activities"])))
    if kind == "contact":
        conn.execute(delete(contact).where(contact.c.id == id_))
        return
    if plan["deals"]:
        if kind == "organization":
            conn.execute(delete(deal).where(deal.c.id.in_(plan["deals"])))
        else:
            conn.execute(delete(deal).where(deal.c.id == id_))
            renumber(conn, None)
    if kind == "organization":
        if plan["contacts"]:
            conn.execute(delete(contact).where(contact.c.id.in_(plan["contacts"])))
        conn.execute(delete(organization).where(organization.c.id == id_))
        renumber(conn, None)


def renumber(conn: Connection, stage: str | None) -> None:
    """Make positions 0..n-1 in a stage (or in every stage)."""
    stages = [stage] if stage else rules.STAGES
    for s in stages:
        ids = [
            r[0]
            for r in conn.execute(
                select(deal.c.id)
                .where(deal.c.stage == s)
                .order_by(deal.c.position, deal.c.id)
            )
        ]
        for pos, did in enumerate(ids):
            conn.execute(deal.update().where(deal.c.id == did).values(position=pos))


def count_where(conn: Connection, table, cond) -> int:
    return conn.execute(
        select(func.count()).select_from(table).where(cond)
    ).scalar_one()
