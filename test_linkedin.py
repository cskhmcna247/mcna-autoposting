"""
Test dang bai len LinkedIn ca nhan.
Chay: python test_linkedin.py
"""
import requests
from dotenv import load_dotenv
import os

load_dotenv()

TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN", "")
PERSON_URN = os.getenv("LINKEDIN_PERSON_URN", "")
API = "https://api.linkedin.com/v2"


def check_token():
    print("\n[1] Kiem tra Access Token...")
    resp = requests.get(
        f"{API}/userinfo",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=10,
    )
    if resp.status_code != 200:
        print(f"    LOI: {resp.status_code} {resp.text}")
        return False
    data = resp.json()
    print(f"    Ten: {data.get('name')}")
    print(f"    Email: {data.get('email')}")
    return True


def test_post():
    print("\n[2] Dang bai thu nghiem...")
    message = "Bai dang thu nghiem tu Workflow Tu Dong - Co the xoa sau."
    confirm = input(f'    Se dang: "{message}"\n    Len tai khoan: {PERSON_URN}\n    Tiep tuc? (y/n): ')
    if confirm.lower() != "y":
        print("    Da huy.")
        return

    payload = {
        "author": PERSON_URN,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": message},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }

    resp = requests.post(
        f"{API}/ugcPosts",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        },
        json=payload,
        timeout=20,
    )

    if resp.status_code not in (200, 201):
        print(f"    LOI: {resp.status_code} {resp.text}")
        return

    post_id = resp.headers.get("x-restli-id", resp.json().get("id", ""))
    print(f"    THANH CONG! Post ID: {post_id}")


def main():
    print("=" * 45)
    print("  TEST LINKEDIN AUTO POSTING")
    print("=" * 45)

    if not TOKEN or not PERSON_URN:
        print("\nLOI: Chua cau hinh LINKEDIN_ACCESS_TOKEN hoac LINKEDIN_PERSON_URN trong .env")
        return

    if not check_token():
        return

    test_post()
    print("\n" + "=" * 45)


if __name__ == "__main__":
    main()
