"""SQLAlchemy Core engine and table definitions."""

import os
import threading
from pathlib import Path

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Engine,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    event,
    func,
)
from sqlalchemy.pool import NullPool

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = ROOT / "data" / "accountable.db"

metadata = MetaData()


def _stamps() -> list[Column]:
    return [
        Column("created_at", DateTime, nullable=False, server_default=func.now()),
        Column(
            "updated_at",
            DateTime,
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        ),
    ]


organization = Table(
    "organization",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("website", String(300)),
    Column("industry", String(100)),
    Column("notes", Text),
    *_stamps(),
)

contact = Table(
    "contact",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("first_name", String(100), nullable=False),
    Column("last_name", String(100), nullable=False),
    Column("email", String(200)),
    Column("phone", String(50)),
    Column("job_title", String(150)),
    Column("organization_id", Integer, ForeignKey("organization.id")),
    Column("status", String(20), nullable=False, server_default="lead"),
    *_stamps(),
)

deal = Table(
    "deal",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(200), nullable=False),
    Column("organization_id", Integer, ForeignKey("organization.id"), nullable=False),
    Column("contact_id", Integer, ForeignKey("contact.id")),
    Column("stage", String(20), nullable=False, server_default="new"),
    Column("value", Integer, nullable=False, server_default="0"),
    Column("probability", Integer, nullable=False, server_default="5"),
    Column("close_date", Date),
    Column("position", Integer, nullable=False, server_default="0"),
    *_stamps(),
)

activity = Table(
    "activity",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("type", String(20), nullable=False),
    Column("contact_id", Integer, ForeignKey("contact.id")),
    Column("deal_id", Integer, ForeignKey("deal.id")),
    Column("description", Text, nullable=False, server_default=""),
    Column("occurred_at", DateTime, nullable=False),
    Column("follow_up_date", Date),
    Column("follow_up_done", Boolean, nullable=False, server_default="0"),
    *_stamps(),
)

# One writer at a time. Moving a deal reads positions and rewrites them, so two requests at once
# could overlap and one would fail with "database is locked". This is a single-process app.
write_lock = threading.RLock()

_engines: dict[str, Engine] = {}


def db_path() -> Path:
    return Path(os.environ.get("ACCOUNTABLE_DB") or DEFAULT_DB)


def get_engine() -> Engine:
    path = db_path()
    key = str(path)
    if key not in _engines:
        path.parent.mkdir(parents=True, exist_ok=True)
        engine = create_engine(f"sqlite:///{path}", poolclass=NullPool)

        @event.listens_for(engine, "connect")
        def _pragmas(dbapi_conn, _record):  # pragma: no cover - trivial
            dbapi_conn.execute("PRAGMA journal_mode=WAL")
            dbapi_conn.execute("PRAGMA busy_timeout=5000")

        _engines[key] = engine
    return _engines[key]


def create_tables() -> None:
    metadata.create_all(get_engine())


def drop_tables() -> None:
    metadata.drop_all(get_engine())
