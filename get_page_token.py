import requests
from dotenv import load_dotenv
import os

load_dotenv(override=True)

page_id = os.getenv("FACEBOOK_PAGE_ID")
user_token = os.getenv("FACEBOOK_ACCESS_TOKEN")

print("Dang lay Page Access Token...")
r = requests.get(
    f"https://graph.facebook.com/v21.0/{page_id}",
    params={"fields": "access_token", "access_token": user_token},
)
data = r.json()

if "access_token" in data:
    print(f"\nPage Access Token:\n{data['access_token']}")
else:
    print(f"\nLoi: {data}")
