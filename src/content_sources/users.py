from datetime import datetime, timezone

from src.supabase_client import get_client

TABLE = "users"


def get_user_by_email(email):
    client = get_client()
    resp = client.table(TABLE).select("*").eq("email", email).maybe_single().execute()
    return resp.data if resp else None


def get_user_by_id(user_id):
    client = get_client()
    resp = client.table(TABLE).select("*").eq("id", user_id).maybe_single().execute()
    return resp.data if resp else None


def list_users():
    client = get_client()
    resp = client.table(TABLE).select("id,email,display_name,role,created_at").order("created_at").execute()
    return resp.data or []


def create_user(email, password_hash, display_name, role="member"):
    client = get_client()
    resp = (
        client.table(TABLE)
        .insert(
            {
                "email": email,
                "password_hash": password_hash,
                "display_name": display_name,
                "role": role,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .execute()
    )
    return resp.data[0] if resp.data else None


def update_role(user_id, role):
    client = get_client()
    resp = client.table(TABLE).update({"role": role}).eq("id", user_id).execute()
    return resp.data[0] if resp.data else None


def delete_user(user_id):
    client = get_client()
    client.table(TABLE).delete().eq("id", user_id).execute()


def count_users():
    client = get_client()
    resp = client.table(TABLE).select("id", count="exact").execute()
    return resp.count or 0
