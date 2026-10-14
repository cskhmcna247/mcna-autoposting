"""Tim Page ID tu Access Token"""
import requests
from dotenv import load_dotenv
import os

load_dotenv()
TOKEN = os.getenv("FACEBOOK_ACCESS_TOKEN")

print("Dang kiem tra token va tim Page ID...\n")

resp = requests.get("https://graph.facebook.com/v21.0/me/accounts", params={
    "access_token": TOKEN,
    "fields": "id,name,access_token",
}, timeout=10)

data = resp.json()

if "error" in data:
    print(f"LOI: {data['error']['message']}")
    print("\nCo the token la User Token. Thu kiem tra token:")
    resp2 = requests.get("https://graph.facebook.com/v21.0/me", params={
        "access_token": TOKEN,
        "fields": "id,name",
    }, timeout=10)
    data2 = resp2.json()
    if "error" not in data2:
        print(f"  Day la User Token cua: {data2.get('name')} (ID: {data2.get('id')})")
        print("  Ban can chuyen sang Page Token trong Graph API Explorer.")
    else:
        print(f"  Token khong hop le: {data2['error']['message']}")
else:
    pages = data.get("data", [])
    if not pages:
        print("Khong tim thay Page nao. Ban co la Admin cua Page khong?")
    else:
        print(f"Tim thay {len(pages)} Page:\n")
        for i, page in enumerate(pages, 1):
            print(f"  [{i}] {page['name']}")
            print(f"      Page ID: {page['id']}")
            print(f"      Page Token: {page['access_token'][:40]}...")
            print()
        print("Copy PAGE ID va PAGE TOKEN o tren, dien vao file .env")
