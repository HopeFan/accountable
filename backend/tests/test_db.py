from sqlalchemy import func, literal, null, select

from app import db


def test_accountable_db_wins_over_database_url(monkeypatch, tmp_path):
    monkeypatch.setenv("ACCOUNTABLE_DB", str(tmp_path / "t.db"))
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@db.example/app")
    assert db.database_url() == f"sqlite:///{tmp_path / 't.db'}"
    assert db.is_sqlite()


def test_database_url_is_rewritten_for_psycopg(monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_DB", raising=False)
    for scheme in ("postgresql", "postgres"):
        monkeypatch.setenv("DATABASE_URL", f"{scheme}://u:p@db.example:6543/app")
        assert db.database_url() == "postgresql+psycopg://u:p@db.example:6543/app"
        assert not db.is_sqlite()


def test_default_is_the_local_file(monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_DB", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert db.database_url() == f"sqlite:///{db.DEFAULT_DB}"


def test_postgres_engine_suits_a_transaction_pooler(monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_DB", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@db.invalid/app")
    engine = db.get_engine()  # builds the engine without connecting
    assert engine.dialect.driver == "psycopg"


def test_sqlite_lower_handles_accents(db_file):
    with db.get_engine().connect() as conn:
        row = conn.execute(
            select(func.lower(literal("ÉLODIE")), func.lower(null()))
        ).one()
    assert row == ("élodie", None)


def test_unreachable_database_url_does_not_affect_a_test_run(db_file, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@unreachable.invalid/app")
    db.create_tables()
    with db.get_engine().connect() as conn:
        assert conn.execute(select(literal(1))).scalar_one() == 1
    assert db_file.exists()
