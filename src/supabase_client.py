from supabase import create_client, Client

from src.config_loader import SUPABASE_URL, SUPABASE_KEY

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL hoac SUPABASE_KEY chua duoc cau hinh trong .env")
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client
