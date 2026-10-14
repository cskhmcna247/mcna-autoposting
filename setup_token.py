"""Doi token thanh long-lived va tim Page ID + Page Token"""
import requests

APP_ID = "4325505087700459"
APP_SECRET = "2e14b92f85b50f5cb85a2e419555decf"
SHORT_TOKEN = "EAA9eBiI5ZCesBSSZAnsCTSfurW9UIl2BUNnPGl4WeAVodn43Xm7hSObbj5ZBYnRS5JxCgvR3avSzpS5Sp65upJB2yDLLmBYXJ2h3pF6I93DZBBm0KblMa90wJMcY22qtwVSrgpcZCi9dlf4I7sVotQoiyZCWpWh0u56a7Fp5WkCTA3L5XBihmfmZCZBOq0t6SE2ZBOodSiDzusYvLeLQPpnNyoTqZBlt5c3b5liEzMuV85pcDUr5rCzOAORB2990OKcBU3VldRMYIn9GAPRiAyjC0gh817pwZDZD"

print("=" * 50)
print("  SETUP FACEBOOK TOKEN")
print("=" * 50)

# Buoc 1: Doi sang long-lived user token
print("\n[1] Doi sang long-lived user token...")
resp = requests.get("https://graph.facebook.com/v21.0/oauth/access_token", params={
    "grant_type": "fb_exchange_token",
    "client_id": APP_ID,
    "client_secret": APP_SECRET,
    "fb_exchange_token": SHORT_TOKEN,
}, timeout=15)
data = resp.json()

if "error" in data:
    print(f"    LOI: {data['error']['message']}")
    exit(1)

long_token = data["access_token"]
print(f"    OK! Long-lived token: {long_token[:40]}...")

# Buoc 2: Lay danh sach Pages va Page Token vinh vien
print("\n[2] Tim Page ID va Page Token...")
resp2 = requests.get("https://graph.facebook.com/v21.0/me/accounts", params={
    "access_token": long_token,
    "fields": "id,name,access_token",
}, timeout=15)
data2 = resp2.json()

if "error" in data2:
    print(f"    LOI: {data2['error']['message']}")
    exit(1)

pages = data2.get("data", [])
if not pages:
    print("    Khong tim thay Page nao!")
    exit(1)

print(f"    Tim thay {len(pages)} Page:\n")
for i, page in enumerate(pages, 1):
    print(f"    [{i}] {page['name']}")
    print(f"        PAGE_ID    = {page['id']}")
    print(f"        PAGE_TOKEN = {page['access_token']}")
    print()

print("=" * 50)
print("COPY 2 gia tri PAGE_ID va PAGE_TOKEN o tren")
print("Gui lai cho toi de cap nhat file .env")
print("=" * 50)
