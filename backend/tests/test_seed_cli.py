import pytest

import seed_cli
from app import db, seed


@pytest.fixture()
def shared_database(monkeypatch):
    """A Postgres address that is never reached: the wipe itself is replaced by a recorder."""
    monkeypatch.delenv("ACCOUNTABLE_DB", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@db.invalid/app")
    calls = []
    monkeypatch.setattr(db, "migrate", lambda *a: calls.append("migrate"))
    monkeypatch.setattr(seed, "reset", lambda: calls.append("reset"))
    return calls


def answer(monkeypatch, text):
    monkeypatch.setattr("builtins.input", lambda _prompt: text)


def test_yes_wipes_a_shared_database(shared_database, monkeypatch):
    answer(monkeypatch, " Yes ")
    seed_cli.main()
    assert shared_database == ["migrate", "reset"]


@pytest.mark.parametrize("reply", ["", "y", "no", "yes please"])
def test_any_other_answer_changes_nothing(shared_database, monkeypatch, reply):
    answer(monkeypatch, reply)
    with pytest.raises(SystemExit):
        seed_cli.main()
    assert shared_database == []


def test_a_local_file_is_wiped_without_asking(db_file, monkeypatch):
    monkeypatch.setattr("builtins.input", pytest.fail)
    seed_cli.main()
    assert db_file.exists()
