from typing import Optional

from src.content_sources.database import DatabaseSource

_db_source: Optional[DatabaseSource] = None


def get_db() -> DatabaseSource:
    global _db_source
    if _db_source is None:
        _db_source = DatabaseSource()
    return _db_source
