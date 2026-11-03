"""Dat lai mat khau cho 1 tai khoan trong bang users.

Cach dung:
    python reset_password.py <email>            # chi doi mat khau
    python reset_password.py <email> --admin    # doi mat khau + cap quyen admin
"""
import getpass
import sys

from server.routers.auth import USERS_TABLE, _hash_password, _supabase


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    email = sys.argv[1].strip().lower()
    make_admin = "--admin" in sys.argv[2:]

    found = _supabase.table(USERS_TABLE).select("id, display_name, role").eq("email", email).execute()
    if not found.data:
        print(f"Khong tim thay tai khoan: {email}")
        sys.exit(1)
    user = found.data[0]
    print(f"Tai khoan: {email} ({user['display_name']}, role={user['role']})")

    password = getpass.getpass("Mat khau moi (it nhat 6 ky tu): ")
    if len(password) < 6:
        print("Mat khau qua ngan")
        sys.exit(1)
    if password != getpass.getpass("Nhap lai mat khau: "):
        print("Hai lan nhap khong khop")
        sys.exit(1)

    changes = {"password_hash": _hash_password(password)}
    if make_admin:
        changes["role"] = "admin"
    _supabase.table(USERS_TABLE).update(changes).eq("id", user["id"]).execute()
    print("Da cap nhat." + (" Role -> admin." if make_admin else ""))


if __name__ == "__main__":
    main()
