import requests
from dotenv import load_dotenv
import os

load_dotenv(override=True)
token = os.getenv("FACEBOOK_ACCESS_TOKEN")

r = requests.get(
    "https://graph.facebook.com/v21.0/me/permissions",
    params={"access_token": token},
)
data = r.json()

if "data" in data:
    print("Permissions hien tai:")
    for p in data["data"]:
        print(f"  {p['permission']}: {p['status']}")

    names = [p["permission"] for p in data["data"]]
    if "pages_manage_engagement" in names:
        print("\n=> CO pages_manage_engagement")
    else:
        print("\n=> THIEU pages_manage_engagement !!!")
else:
    print(f"Loi: {data}")
