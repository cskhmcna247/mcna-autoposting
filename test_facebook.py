"""
Test dang bai len Facebook Page.
Chay: python test_facebook.py
"""
import requests
from dotenv import load_dotenv
import os

load_dotenv()

PAGE_ID = os.getenv("FACEBOOK_PAGE_ID", "")
ACCESS_TOKEN = os.getenv("FACEBOOK_ACCESS_TOKEN", "")
GRAPH_API = "https://graph.facebook.com/v21.0"


def check_token():
    print("\n[1] Kiem tra Access Token...")
    resp = requests.get(f"{GRAPH_API}/{PAGE_ID}", params={
        "fields": "name,id,fan_count",
        "access_token": ACCESS_TOKEN,
    }, timeout=10)
    data = resp.json()

    if "error" in data:
        print(f"    LOI: {data['error']['message']}")
        return False

    print(f"    Page: {data.get('name')}")
    print(f"    ID:   {data.get('id')}")
    print(f"    Fans: {data.get('fan_count', 'N/A')}")
    return True


def check_permissions():
    print("\n[2] Kiem tra quyen...")
    resp = requests.get(f"{GRAPH_API}/{PAGE_ID}", params={
        "fields": "access_token",
        "access_token": ACCESS_TOKEN,
    }, timeout=10)
    data = resp.json()

    if "error" in data:
        print(f"    LOI: {data['error']['message']}")
        return False

    print("    Token hop le va co quyen truy cap Page.")
    return True


def test_post():
    print("\n[3] Dang bai thu nghiem...")
    message = "Bai dang thu nghiem tu Workflow Tu Dong - Co the xoa sau."
    confirm = input(f'    Se dang: "{message}"\n    Tiep tuc? (y/n): ')
    if confirm.lower() != "y":
        print("    Da huy.")
        return

    resp = requests.post(f"{GRAPH_API}/{PAGE_ID}/feed", data={
        "message": message,
        "access_token": ACCESS_TOKEN,
    }, timeout=30)
    data = resp.json()

    if "error" in data:
        print(f"    LOI: {data['error']['message']}")
        return

    post_id = data.get("id", "")
    print(f"    THANH CONG! Post ID: {post_id}")
    print(f"    Xem tai: https://facebook.com/{post_id}")


def main():
    print("=" * 45)
    print("  TEST FACEBOOK AUTO POSTING")
    print("=" * 45)

    if not PAGE_ID or not ACCESS_TOKEN:
        print("\nLOI: Chua cau hinh FACEBOOK_PAGE_ID hoac FACEBOOK_ACCESS_TOKEN")
        print("Mo file .env va dien thong tin truoc khi chay.")
        return

    print(f"\n  Page ID: {PAGE_ID}")
    print(f"  Token:   {ACCESS_TOKEN[:20]}...")

    if not check_token():
        return

    if not check_permissions():
        return

    test_post()
    print("\n" + "=" * 45)


if __name__ == "__main__":
    main()
