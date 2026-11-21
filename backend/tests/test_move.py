import pytest
from sqlalchemy import select

from app import db


@pytest.fixture()
def board(client, make):
    org = make.org()
    cols = {"new": [], "qualified": []}
    for stage in cols:
        for n in range(4):
            cols[stage].append(make.deal(org["id"], name=f"{stage}{n}", stage=stage)["id"])
    return cols


def order(client, stage):
    deals = [d for d in client.get("/api/deals").json() if d["stage"] == stage]
    assert [d["position"] for d in sorted(deals, key=lambda d: d["position"])] == list(range(len(deals)))
    return [d["id"] for d in sorted(deals, key=lambda d: d["position"])]


def stage_changes(deal_id):
    with db.get_engine().connect() as conn:
        return conn.execute(
            select(db.activity.c.description).where(db.activity.c.deal_id == deal_id, db.activity.c.type == "stage_change")
        ).scalars().all()


@pytest.mark.parametrize("position", [0, 2, 4, 99])
def test_move_to_another_column_first_middle_last(client, board, position):
    mover = board["new"][1]
    r = client.post(f"/api/deals/{mover}/move", json={"stage": "qualified", "position": position})
    assert r.status_code == 200 and r.json()["stage"] == "qualified"
    q = order(client, "qualified")
    assert q.index(mover) == min(position, 4) and len(q) == 5
    assert order(client, "new") == [i for i in board["new"] if i != mover]


@pytest.mark.parametrize("position,expected", [(0, 0), (1, 1), (3, 3)])
def test_move_within_a_column(client, board, position, expected):
    ids = board["new"]
    mover = ids[2]
    client.post(f"/api/deals/{mover}/move", json={"stage": "new", "position": position})
    result = order(client, "new")
    assert result.index(mover) == expected and sorted(result) == sorted(ids)
    assert stage_changes(mover) == []


def test_move_into_an_empty_column(client, board):
    mover = board["new"][0]
    r = client.post(f"/api/deals/{mover}/move", json={"stage": "proposal", "position": 0})
    assert r.json()["position"] == 0 and order(client, "proposal") == [mover]


def test_probability_and_close_date_follow_rules(client, board):
    mover = board["new"][0]
    r = client.post(f"/api/deals/{mover}/move", json={"stage": "negotiation", "position": 0}).json()
    assert r["probability"] == 70 and r["close_date"] is None
    r = client.post(f"/api/deals/{mover}/move", json={"stage": "won", "position": 0}).json()
    assert r["probability"] == 100 and r["close_date"] == "2026-11-17"


def test_exactly_one_stage_change_entry(client, board):
    mover = board["new"][0]
    client.post(f"/api/deals/{mover}/move", json={"stage": "proposal", "position": 0})
    assert stage_changes(mover) == ["Moved from New to Proposal"]
    client.post(f"/api/deals/{mover}/move", json={"stage": "proposal", "position": 0})
    assert len(stage_changes(mover)) == 1


def test_move_to_same_place_changes_nothing(client, board):
    before = client.get("/api/deals").json()
    client.post(f"/api/deals/{board['new'][2]}/move", json={"stage": "new", "position": 2})
    assert client.get("/api/deals").json() == before


def test_new_deal_goes_to_end_or_given_position(client, board, make):
    org = client.get("/api/organizations").json()[0]
    last = make.deal(org["id"], name="last", stage="new")
    assert order(client, "new")[-1] == last["id"]
    first = make.deal(org["id"], name="first", stage="new", position=0)
    assert order(client, "new")[0] == first["id"]


def test_edit_that_changes_stage_goes_to_end_of_new_column(client, board):
    mover = board["new"][0]
    client.patch(f"/api/deals/{mover}", json={"stage": "qualified"})
    assert order(client, "qualified")[-1] == mover
    assert stage_changes(mover) == ["Moved from New to Qualified"]
    assert order(client, "new") == board["new"][1:]


def test_move_missing_deal(client):
    assert client.post("/api/deals/99/move", json={"stage": "new", "position": 0}).status_code == 404


def test_moves_at_the_same_time_keep_positions_consecutive(client, make):
    """Two drags in quick succession must not collide or leave gaps."""
    from concurrent.futures import ThreadPoolExecutor

    org = make.org()
    ids = [make.deal(org["id"], name=f"d{i}", stage="new")["id"] for i in range(10)]

    def go(i):
        return client.post(f"/api/deals/{ids[i]}/move", json={"stage": "qualified" if i % 2 else "new", "position": 0}).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        codes = list(pool.map(go, range(10)))
    assert codes == [200] * 10
    for stage, expected in (("new", 5), ("qualified", 5)):
        assert len(order(client, stage)) == expected  # order() also checks positions are 0..n-1
