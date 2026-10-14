"""Tao Google Sheet voi cau truc dung va them du lieu mau"""
import gspread
from google.oauth2.service_account import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

creds = Credentials.from_service_account_file("config/google_credentials.json", scopes=SCOPES)
client = gspread.authorize(creds)

print("Dang tao Google Sheet...")
sheet = client.create("Auto Posting - MCNA PTD")
ws = sheet.sheet1

# Tao header
ws.update("A1:G1", [["title", "content", "image_url", "platforms", "status", "scheduled_time", "posted_at"]])

# Them du lieu mau
ws.update("A2:G2", [["Bai test", "Day la bai dang thu tu workflow tu dong MCNA", "", "facebook", "pending", "", ""]])

# Format header dam
ws.format("A1:G1", {"textFormat": {"bold": True}})

print(f"\nTao thanh cong!")
print(f"Sheet ID: {sheet.id}")
print(f"URL: https://docs.google.com/spreadsheets/d/{sheet.id}/edit")

# Share cho chinh ban (thay email cua ban vao day)
sheet.share("thanhtung123456789tbsa3@gmail.com", perm_type="user", role="writer")
print(f"\nDa share cho thanhtung123456789tbsa3@gmail.com")
