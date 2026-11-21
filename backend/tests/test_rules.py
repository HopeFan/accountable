from datetime import date

from app import rules

TODAY = date(2026, 11, 17)


def test_usual_probability_for_each_stage():
    assert [rules.usual_probability(s) for s in rules.STAGES] == [5, 20, 40, 70, 100, 0]


def test_expected_revenue():
    assert rules.expected_revenue("proposal", 50000, 40) == 20000
    assert rules.expected_revenue("negotiation", 10000, 33) == 3300
    assert rules.expected_revenue("won", 48000, 100) == 48000
    assert rules.expected_revenue("won", 48000, 20) == 48000
    assert rules.expected_revenue("lost", 48000, 40) == 0


def test_late_only_for_open_deals_before_today():
    yesterday, tomorrow = date(2026, 11, 16), date(2026, 11, 18)
    assert rules.is_late("new", yesterday, TODAY)
    assert rules.is_late("negotiation", yesterday, TODAY)
    assert not rules.is_late("new", TODAY, TODAY)
    assert not rules.is_late("new", tomorrow, TODAY)
    assert not rules.is_late("won", yesterday, TODAY)
    assert not rules.is_late("lost", yesterday, TODAY)
    assert not rules.is_late("new", None, TODAY)


def test_follow_up_states():
    assert rules.follow_up_state(None, False, TODAY) is None
    assert rules.follow_up_state(date(2026, 11, 16), False, TODAY) == "overdue"
    assert rules.follow_up_state(TODAY, False, TODAY) == "open"
    assert rules.follow_up_state(date(2026, 11, 20), False, TODAY) == "open"
    assert rules.follow_up_state(date(2026, 11, 1), True, TODAY) == "done"


def test_funnel_counts_non_lost_deals_at_their_stage_and_earlier():
    deals = [
        {"stage": "new", "value": 1000},
        {"stage": "qualified", "value": 2000},
        {"stage": "proposal", "value": 4000},
        {"stage": "negotiation", "value": 8000},
        {"stage": "won", "value": 16000},
        {"stage": "lost", "value": 32000},
    ]
    rows = {r["stage"]: r for r in rules.funnel(deals)}
    assert list(rows) == ["new", "qualified", "proposal", "negotiation", "won"]
    assert rows["new"]["value"] == 31000 and rows["new"]["count"] == 5
    assert rows["qualified"]["value"] == 30000
    assert rows["proposal"]["value"] == 28000
    assert rows["negotiation"]["value"] == 24000
    assert rows["won"]["value"] == 16000 and rows["won"]["count"] == 1


def test_last_twelve_months_end_with_this_month():
    months = rules.last_months(TODAY)
    assert len(months) == 12
    assert months[0] == date(2025, 12, 1) and months[-1] == date(2026, 11, 1)
    assert rules.last_months(date(2026, 2, 3))[0] == date(2025, 3, 1)
