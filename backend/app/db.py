"""SQLAlchemy Core engine and table definitions."""

import os
import threading
from pathlib import Path

from sqlalchemy import (
    Boolean,
    Column,
    Connection,
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
    false,
    func,
    inspect,
)
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

ROOT = Path(__file__).resolve().parents[2]
ALEMBIC_INI = ROOT / "backend" / "alembic.ini"
DEFAULT_DB = ROOT / "data" / "accountable.db"

metadata = MetaData()


AUTHOR_COLUMNS = ("created_by", "updated_by")


def _authors() -> list[Column]:
    """The email of the person who added and last changed the row. Sample rows have neither."""
    return [Column(name, String(320)) for name in AUTHOR_COLUMNS]


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
    *_authors(),
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
    *_authors(),
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
    *_authors(),
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
    Column("follow_up_done", Boolean, nullable=False, server_default=false()),
    *_stamps(),
    *_authors(),
)

# One writer at a time. Moving a deal reads positions and rewrites them, so two requests at once
# could overlap and one would fail with "database is locked". This is a single-process app.
write_lock = threading.RLock()

_engines: dict[str, Engine] = {}


def database_url() -> str:
    """ACCOUNTABLE_DB wins over DATABASE_URL, so a test can never be sent to a real database."""
    if path := os.environ.get("ACCOUNTABLE_DB"):
        return f"sqlite:///{path}"
    if url := os.environ.get("DATABASE_URL"):
        return _for_psycopg(url)
    return f"sqlite:///{DEFAULT_DB}"


def _for_psycopg(url: str) -> str:
    """Hosts hand out postgres:// or postgresql://, which SQLAlchemy would send to psycopg2."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


def is_sqlite() -> bool:
    return make_url(database_url()).get_backend_name() == "sqlite"


def _unicode_lower(value: str | None) -> str | None:
    return None if value is None else value.lower()


def _make_sqlite_engine(url: str) -> Engine:
    database = make_url(url).database
    if database:
        Path(database).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, poolclass=NullPool)

    @event.listens_for(engine, "connect")
    def _setup(dbapi_conn, _record):  # pragma: no cover - trivial
        dbapi_conn.execute("PRAGMA journal_mode=WAL")
        dbapi_conn.execute("PRAGMA busy_timeout=5000")
        # SQLite's own lower() only handles ASCII; Postgres's handles accents.
        dbapi_conn.create_function("lower", 1, _unicode_lower, deterministic=True)

    return engine


def _make_postgres_engine(url: str) -> Engine:
    # Supabase's pooler runs in transaction mode, which rejects prepared statements.
    return create_engine(
        url, pool_pre_ping=True, connect_args={"prepare_threshold": None}
    )


def get_engine() -> Engine:
    url = database_url()
    if url not in _engines:
        make = _make_sqlite_engine if is_sqlite() else _make_postgres_engine
        _engines[url] = make(url)
    return _engines[url]


def create_tables() -> None:
    metadata.create_all(get_engine())


def is_new_database(connection: Connection) -> bool:
    """True when nothing has created the tables yet (neither Alembic nor an older run)."""
    names = set(inspect(connection).get_table_names())
    return not names & {"alembic_version", organization.name}


def migrate(connection: Connection | None = None) -> None:
    """Bring the schema up to date, on the given connection so the caller can add more to its transaction."""
    from alembic import command
    from alembic.config import Config

    config = Config(str(ALEMBIC_INI))
    config.attributes["connection"] = connection
    command.upgrade(config, "head")
