"""Resets the database to the sample data. Run with `npm run seed`."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app import db, seed


def confirmed() -> bool:
    """Wiping a shared database is easy to do by accident, so it has to be agreed to (R37)."""
    if db.is_sqlite():
        return True
    answer = input(
        "This deletes ALL data in the shared database. Type 'yes' to go on: "
    )
    return answer.strip().lower() == "yes"


def main() -> None:
    if not confirmed():
        sys.exit("Nothing was changed.")
    db.migrate()
    seed.reset()
    print("Sample data restored.")


if __name__ == "__main__":
    main()
