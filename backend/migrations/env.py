"""Alembic environment: migrations run against the engine the app itself uses."""

from alembic import context

from app import db


def run(connection) -> None:
    context.configure(connection=connection, target_metadata=db.metadata)
    with context.begin_transaction():
        context.run_migrations()


if (given := context.config.attributes.get("connection")) is not None:
    run(given)
else:
    with db.get_engine().begin() as connection:
        run(connection)
