from fastapi import APIRouter

from ..common import activities
from ..db import activity, get_engine

router = APIRouter(prefix="/follow-ups", tags=["follow-ups"])


def open_follow_ups(conn) -> list[dict]:
    rows = activities(
        conn,
        activity.c.follow_up_date.is_not(None) & (activity.c.follow_up_done == False),  # noqa: E712
    )
    return sorted(rows, key=lambda r: (r["follow_up_date"], r["id"]))


@router.get("")
def list_follow_ups():
    with get_engine().connect() as conn:
        return open_follow_ups(conn)
