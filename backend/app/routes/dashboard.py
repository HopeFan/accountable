from datetime import date

from fastapi import APIRouter

from .. import clock, rules
from ..common import activities, all_deals
from ..db import activity, get_engine
from .follow_ups import open_follow_ups

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def build_dashboard(conn) -> dict:
    today = clock.today()
    deals = all_deals(conn)
    open_deals = [d for d in deals if rules.is_open(d["stage"])]

    pipeline = []
    for stage in rules.OPEN_STAGES:
        ds = [d for d in open_deals if d["stage"] == stage]
        pipeline.append(
            {
                "stage": stage,
                "count": len(ds),
                "value": sum(d["value"] for d in ds),
                "probability": rules.usual_probability(stage),
                "expected_revenue": sum(d["expected_revenue"] for d in ds),
            }
        )

    months = rules.last_months(today)
    won = [d for d in deals if d["stage"] == "won" and d["close_date"]]
    monthly = []
    for m in months:
        in_month = [
            d for d in won if date.fromisoformat(d["close_date"]).replace(day=1) == m
        ]
        monthly.append(
            {
                "month": m.strftime("%Y-%m"),
                "revenue": sum(d["value"] for d in in_month),
                "deals_won": len(in_month),
            }
        )
    this_month = monthly[-1]

    follow_ups = open_follow_ups(conn)
    return {
        "today": today.isoformat(),
        "tiles": {
            "open_pipeline_value": sum(d["value"] for d in open_deals),
            "open_deals": len(open_deals),
            "expected_revenue": sum(d["expected_revenue"] for d in open_deals),
            "won_this_month_value": this_month["revenue"],
            "won_this_month_count": this_month["deals_won"],
            "overdue_follow_ups": sum(
                1 for f in follow_ups if f["follow_up_state"] == "overdue"
            ),
        },
        "pipeline": pipeline,
        "monthly": monthly,
        "funnel": rules.funnel(deals),
        "lost": {
            "count": sum(1 for d in deals if d["stage"] == "lost"),
            "value": sum(d["value"] for d in deals if d["stage"] == "lost"),
        },
        "follow_ups": follow_ups,
        "recent_activity": activities(conn, activity.c.id.is_not(None), limit=10),
    }


@router.get("")
def get_dashboard():
    with get_engine().connect() as conn:
        return build_dashboard(conn)
