from fastapi import APIRouter, Response
from sqlalchemy import func, insert, select, update

from .. import clock, rules
from ..common import (
    activities,
    all_deals,
    execute_delete,
    field_error,
    get_or_404,
    insert_row,
    plan_delete,
    preview,
    renumber,
)
from ..db import activity, contact, deal, get_engine, organization, write_lock
from ..schemas import DealIn, DealPatch, MoveIn

router = APIRouter(prefix="/deals", tags=["deals"])


def _check_refs(conn, organization_id: int, contact_id: int | None) -> None:
    if (
        conn.execute(
            select(organization.c.id).where(organization.c.id == organization_id)
        ).first()
        is None
    ):
        raise field_error("organization_id", "This organization doesn't exist")
    if contact_id is not None:
        row = conn.execute(
            select(contact.c.organization_id).where(contact.c.id == contact_id)
        ).first()
        if row is None:
            raise field_error("contact_id", "This contact doesn't exist")
        if row[0] != organization_id:
            raise field_error(
                "contact_id", "This contact doesn't work at the deal's organization"
            )


def _count(conn, stage: str, exclude: int | None = None) -> int:
    q = select(func.count()).select_from(deal).where(deal.c.stage == stage)
    if exclude is not None:
        q = q.where(deal.c.id != exclude)
    return conn.execute(q).scalar_one()


def _log_stage_change(conn, deal_id: int, old: str, new: str) -> None:
    conn.execute(
        insert(activity).values(
            type="stage_change",
            deal_id=deal_id,
            description=f"Moved from {rules.STAGE_LABELS[old]} to {rules.STAGE_LABELS[new]}",
            occurred_at=clock.now(),
        )
    )


def move_deal(conn, deal_id: int, stage: str, position: int | None) -> dict:
    """Move a deal to a stage and place. Everything in one transaction (the caller's)."""
    row = get_or_404(conn, deal, deal_id, "Deal")
    old_stage = row["stage"]
    ids = [
        r[0]
        for r in conn.execute(
            select(deal.c.id)
            .where(deal.c.stage == stage, deal.c.id != deal_id)
            .order_by(deal.c.position, deal.c.id)
        )
    ]
    at = len(ids) if position is None else min(position, len(ids))
    if stage == old_stage:
        current = [
            r[0]
            for r in conn.execute(
                select(deal.c.id)
                .where(deal.c.stage == stage)
                .order_by(deal.c.position, deal.c.id)
            )
        ]
        if current.index(deal_id) == at:
            return {"changed": False}
    ids.insert(at, deal_id)
    for pos, did in enumerate(ids):
        conn.execute(update(deal).where(deal.c.id == did).values(position=pos))
    if stage != old_stage:
        values = {
            "stage": stage,
            "probability": rules.usual_probability(stage),
            "close_date": rules.close_date_after_stage_change(
                stage, row["close_date"], clock.today()
            ),
        }
        conn.execute(update(deal).where(deal.c.id == deal_id).values(**values))
        renumber(conn, old_stage)
        _log_stage_change(conn, deal_id, old_stage, stage)
    return {"changed": True}


def _one(conn, deal_id: int) -> dict:
    return all_deals(conn, deal.c.id == deal_id)[0]


@router.get("")
def list_deals():
    with get_engine().connect() as conn:
        out = all_deals(conn)
        return out


@router.post("", status_code=201)
def create_deal(body: DealIn):
    with write_lock, get_engine().begin() as conn:
        _check_refs(conn, body.organization_id, body.contact_id)
        values = body.model_dump()
        position = values.pop("position")
        values["probability"] = (
            rules.usual_probability(body.stage)
            if body.probability is None
            else body.probability
        )
        if body.stage in ("won", "lost") and body.close_date is None:
            values["close_date"] = clock.today()
        values["position"] = _count(conn, body.stage)
        new_id = insert_row(conn, deal, values)
        if position is not None:
            move_deal(conn, new_id, body.stage, position)
        return _one(conn, new_id)


@router.get("/{deal_id}")
def get_deal(deal_id: int):
    with get_engine().connect() as conn:
        get_or_404(conn, deal, deal_id, "Deal")
        out = _one(conn, deal_id)
        out["timeline"] = activities(conn, activity.c.deal_id == deal_id)
        out["today"] = clock.today().isoformat()
        return out


def _apply_patch(conn, deal_id: int, changes: dict) -> dict:
    current = get_or_404(conn, deal, deal_id, "Deal")
    org_id = changes.get("organization_id", current["organization_id"])
    contact_id = changes.get("contact_id", current["contact_id"])
    if "organization_id" in changes or "contact_id" in changes:
        _check_refs(conn, org_id, contact_id)
    new_stage = changes.pop("stage", None)
    if new_stage and new_stage != current["stage"]:
        # a stage change resets probability and close date, unless edited by hand in the same request
        hand_prob = (
            changes.get("probability") is not None
            and changes["probability"] != current["probability"]
        )
        hand_date = (
            "close_date" in changes and changes["close_date"] != current["close_date"]
        )
        move_deal(conn, deal_id, new_stage, None)
        if not hand_prob:
            changes.pop("probability", None)
        if not hand_date:
            changes.pop("close_date", None)
    if changes:
        conn.execute(update(deal).where(deal.c.id == deal_id).values(**changes))
    return _one(conn, deal_id)


@router.patch("/{deal_id}")
def update_deal(deal_id: int, body: DealPatch):
    changes = body.model_dump(exclude_unset=True)
    for f in ("name", "organization_id", "stage", "value", "probability"):
        if f in changes and changes[f] is None:
            raise field_error(f, "This field is required")
    with write_lock, get_engine().begin() as conn:
        return _apply_patch(conn, deal_id, changes)


@router.post("/{deal_id}/move")
def move(deal_id: int, body: MoveIn):
    with write_lock, get_engine().begin() as conn:
        move_deal(conn, deal_id, body.stage, body.position)
        return _one(conn, deal_id)


@router.get("/{deal_id}/delete-preview")
def delete_preview(deal_id: int):
    with get_engine().connect() as conn:
        return preview(plan_delete(conn, "deal", deal_id), "deal")


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int):
    with write_lock:
        with get_engine().begin() as conn:
            plan = plan_delete(conn, "deal", deal_id)
            execute_delete(conn, "deal", deal_id, plan)
        return Response(status_code=204)
