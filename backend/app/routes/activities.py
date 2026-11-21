from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import delete, update

from .. import clock
from ..auth import CurrentUser
from ..common import activities, field_error, get_or_404, insert_row
from ..db import activity, contact, deal, get_engine
from ..schemas import ActivityIn, ActivityPatch

router = APIRouter(prefix="/activities", tags=["activities"])


def _one(conn, activity_id: int) -> dict:
    return activities(conn, activity.c.id == activity_id)[0]


@router.post("", status_code=201)
def create_activity(body: ActivityIn, user: CurrentUser):
    if body.contact_id is None and body.deal_id is None:
        raise field_error("contact_id", "Choose a contact or a deal")
    with get_engine().begin() as conn:
        if body.contact_id is not None:
            get_or_404(conn, contact, body.contact_id, "Contact")
        if body.deal_id is not None:
            get_or_404(conn, deal, body.deal_id, "Deal")
        values = body.model_dump()
        values["occurred_at"] = body.occurred_at or clock.now()
        new_id = insert_row(conn, activity, values, user)
        return _one(conn, new_id)


@router.patch("/{activity_id}")
def update_activity(activity_id: int, body: ActivityPatch, user: CurrentUser):
    changes = body.model_dump(exclude_unset=True)
    for f in ("type", "description", "occurred_at", "follow_up_done"):
        if f in changes and changes[f] is None:
            raise field_error(f, "This field is required")
    with get_engine().begin() as conn:
        row = get_or_404(conn, activity, activity_id, "Activity")
        if row["type"] == "stage_change":
            raise HTTPException(400, detail="Stage changes can't be edited")
        if changes:
            conn.execute(
                update(activity)
                .where(activity.c.id == activity_id)
                .values(**changes, updated_by=user)
            )
        return _one(conn, activity_id)


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int):
    with get_engine().begin() as conn:
        get_or_404(conn, activity, activity_id, "Activity")
        conn.execute(delete(activity).where(activity.c.id == activity_id))
    return Response(status_code=204)
