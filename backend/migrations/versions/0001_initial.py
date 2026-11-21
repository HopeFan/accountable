"""Create the five tables, with the author columns.

Revision ID: 0001
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

AUTHOR_COLUMNS = ("created_by", "updated_by")


def _stamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at", sa.DateTime, nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()
        ),
    ]


def _authors() -> list[sa.Column]:
    return [sa.Column(name, sa.String(320)) for name in AUTHOR_COLUMNS]


def _fk(target: str) -> sa.ForeignKey:
    return sa.ForeignKey(target)


def _tables() -> dict[str, list[sa.Column]]:
    return {
        "organization": [
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("website", sa.String(300)),
            sa.Column("industry", sa.String(100)),
            sa.Column("notes", sa.Text),
        ],
        "contact": [
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("first_name", sa.String(100), nullable=False),
            sa.Column("last_name", sa.String(100), nullable=False),
            sa.Column("email", sa.String(200)),
            sa.Column("phone", sa.String(50)),
            sa.Column("job_title", sa.String(150)),
            sa.Column("organization_id", sa.Integer, _fk("organization.id")),
            sa.Column("status", sa.String(20), nullable=False, server_default="lead"),
        ],
        "deal": [
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column(
                "organization_id",
                sa.Integer,
                _fk("organization.id"),
                nullable=False,
            ),
            sa.Column("contact_id", sa.Integer, _fk("contact.id")),
            sa.Column("stage", sa.String(20), nullable=False, server_default="new"),
            sa.Column("value", sa.Integer, nullable=False, server_default="0"),
            sa.Column("probability", sa.Integer, nullable=False, server_default="5"),
            sa.Column("close_date", sa.Date),
            sa.Column("position", sa.Integer, nullable=False, server_default="0"),
        ],
        "activity": [
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("type", sa.String(20), nullable=False),
            sa.Column("contact_id", sa.Integer, _fk("contact.id")),
            sa.Column("deal_id", sa.Integer, _fk("deal.id")),
            sa.Column("description", sa.Text, nullable=False, server_default=""),
            sa.Column("occurred_at", sa.DateTime, nullable=False),
            sa.Column("follow_up_date", sa.Date),
            sa.Column(
                "follow_up_done", sa.Boolean, nullable=False, server_default=sa.false()
            ),
        ],
    }


def _add_missing_authors(table: str) -> None:
    """A database made by the app before accounts existed has the tables, but not the authors."""
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}
    for name in AUTHOR_COLUMNS:
        if name not in existing:
            op.add_column(table, sa.Column(name, sa.String(320)))


def upgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    for name, columns in _tables().items():
        if name in existing:
            _add_missing_authors(name)
        else:
            op.create_table(name, *columns, *_stamps(), *_authors())


def downgrade() -> None:
    for name in reversed(list(_tables())):
        op.drop_table(name)
