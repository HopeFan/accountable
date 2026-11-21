"""Resets the database to the sample data. Run with `npm run seed`."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app import db, seed

if __name__ == "__main__":
    seed.reset()
    print(f"Sample data restored in {db.db_path()}")
