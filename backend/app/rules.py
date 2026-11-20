"""Business rules. No database access."""

from datetime import date

STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"]
OPEN_STAGES = ["new", "qualified", "proposal", "negotiation"]
FUNNEL_STAGES = ["new", "qualified", "proposal", "negotiation", "won"]
PROBABILITY = {
    "new": 5,
    "qualified": 20,
    "proposal": 40,
    "negotiation": 70,
    "won": 100,
    "lost": 0,
}
STAGE_LABELS = {s: s.capitalize() for s in STAGES}


def usual_probability(stage: str) -> int:
    return PROBABILITY[stage]


def is_open(stage: str) -> bool:
    return stage in OPEN_STAGES


def expected_revenue(stage: str, value: int, probability: int) -> float:
    if stage == "won":
        return float(value)
    if stage == "lost":
        return 0.0
    return value * probability / 100


def close_date_after_stage_change(
    stage: str, current: date | None, today: date
) -> date | None:
    return today if stage in ("won", "lost") else current


def is_late(stage: str, close_date: date | None, today: date) -> bool:
    return is_open(stage) and close_date is not None and close_date < today


def follow_up_state(follow_up_date: date | None, done: bool, today: date) -> str | None:
    if follow_up_date is None:
        return None
    if done:
        return "done"
    return "overdue" if follow_up_date < today else "open"


def funnel(deals: list[dict]) -> list[dict]:
    """Each non-lost deal counts at its stage and every earlier one."""
    rows = []
    for stage in FUNNEL_STAGES:
        idx = FUNNEL_STAGES.index(stage)
        reached = [
            d
            for d in deals
            if d["stage"] != "lost" and FUNNEL_STAGES.index(d["stage"]) >= idx
        ]
        rows.append(
            {
                "stage": stage,
                "count": len(reached),
                "value": sum(d["value"] for d in reached),
            }
        )
    return rows


def month_start(d: date) -> date:
    return d.replace(day=1)


def last_months(today: date, n: int = 12) -> list[date]:
    """First day of each of the last n months, oldest first, ending with this month."""
    out = []
    y, m = today.year, today.month
    for _ in range(n):
        out.append(date(y, m, 1))
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return list(reversed(out))
