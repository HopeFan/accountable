import sqlalchemy
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import inspect

from app import db


def shape(engine):
    inspector = inspect(engine)
    return {
        name: {
            "columns": [
                (c["name"], str(c["type"]), c["nullable"], c["default"])
                for c in inspector.get_columns(name)
            ],
            "keys": inspector.get_pk_constraint(name)["constrained_columns"],
            "foreign_keys": sorted(
                (tuple(f["constrained_columns"]), f["referred_table"])
                for f in inspector.get_foreign_keys(name)
            ),
        }
        for name in sorted(inspector.get_table_names())
        if name != "alembic_version"
    }


def test_migrations_build_the_tables_the_definitions_describe(db_file, tmp_path):
    db.migrate()
    migrated = shape(db.get_engine())

    other = tmp_path / "definitions.db"
    engine = sqlalchemy.create_engine(f"sqlite:///{other}")
    db.metadata.create_all(engine)

    assert migrated == shape(engine)
    assert set(migrated) == {"organization", "contact", "deal", "activity"}


def test_running_the_migrations_twice_changes_nothing(db_file):
    db.migrate()
    once = shape(db.get_engine())
    db.migrate()
    assert shape(db.get_engine()) == once


def test_an_older_database_gets_the_author_columns(db_file):
    db.create_tables()
    with db.get_engine().begin() as conn:
        operations = Operations(MigrationContext.configure(conn))
        for table in ("organization", "contact", "deal", "activity"):
            for column in db.AUTHOR_COLUMNS:
                operations.drop_column(table, column)
    db.migrate()
    columns = {c["name"] for c in inspect(db.get_engine()).get_columns("deal")}
    assert set(db.AUTHOR_COLUMNS) <= columns
