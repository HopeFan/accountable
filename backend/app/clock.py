"""The one place that says what today is.

Tests fix the date with ACCOUNTABLE_TODAY (YYYY-MM-DD).
"""
import os
from datetime import date, datetime, time


def today() -> date:
    fixed = os.environ.get("ACCOUNTABLE_TODAY")
    return date.fromisoformat(fixed) if fixed else date.today()


def now() -> datetime:
    fixed = os.environ.get("ACCOUNTABLE_TODAY")
    if fixed:
        return datetime.combine(date.fromisoformat(fixed), time(12, 0))
    return datetime.now().replace(microsecond=0)
