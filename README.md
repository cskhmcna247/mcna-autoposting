# Workflow Dang Bai Tu Dong - Facebook & LinkedIn

Tu dong dang bai len Facebook Page va LinkedIn theo lich (hang ngay / hang gio).
Noi dung lay tu Google Sheets va/hoac Database (MySQL/PostgreSQL).

## Cau truc project

```
tu_dong_db/
├── main.py                          # Entry point
├── requirements.txt                 # Thu vien Python
├── .env.example                     # Mau cau hinh
├── config/
│   └── google_credentials.json      # Service Account key (ban tu tao)
├── src/
│   ├── config_loader.py             # Doc cau hinh tu .env
│   ├── workflow.py                   # Logic chinh cua workflow
│   ├── content_sources/
│   │   ├── google_sheets.py         # Doc bai tu Google Sheets
│   │   └── database.py              # Doc bai tu MySQL/PostgreSQL
│   └── social_media/
│       ├── facebook_poster.py       # Dang bai len Facebook
│       └── linkedin_poster.py       # Dang bai len LinkedIn
└── logs/
    └── workflow.log                 # Log file
```

## Cai dat

### 1. Cai thu vien

```bash
pip install -r requirements.txt
```

### 2. Cau hinh

Copy `.env.example` thanh `.env` va dien thong tin:

```bash
cp .env.example .env
```

### 3. Cau hinh Facebook

1. Vao [Facebook Developers](https://developers.facebook.com/) tao App
2. Them quyen: `pages_manage_posts`, `pages_read_engagement`
3. Tao Page Access Token (long-lived)
4. Dien `FACEBOOK_PAGE_ID` va `FACEBOOK_ACCESS_TOKEN` vao `.env`

### 4. Cau hinh LinkedIn

1. Vao [LinkedIn Developers](https://www.linkedin.com/developers/) tao App
2. Them quyen: `w_member_social` (ca nhan) hoac `w_organization_social` (company)
3. Lay OAuth 2.0 Access Token
4. Dien `LINKEDIN_ACCESS_TOKEN` va `LINKEDIN_PERSON_URN` (hoac `LINKEDIN_ORG_URN`) vao `.env`

### 5. Cau hinh Google Sheets (neu dung)

1. Tao Service Account tren [Google Cloud Console](https://console.cloud.google.com/)
2. Bat Google Sheets API va Google Drive API
3. Tai file JSON key, luu vao `config/google_credentials.json`
4. Chia se Google Sheet cho email cua Service Account
5. Dien `GOOGLE_SHEET_ID` vao `.env`

**Cau truc Google Sheet:**

| A (title) | B (content) | C (image_url) | D (platforms) | E (status) | F (scheduled_time) | G (posted_at) |
|-----------|------------|---------------|--------------|-----------|-------------------|--------------|
| Tieu de 1 | Noi dung... | https://... | facebook,linkedin | pending | 2026-08-20 09:00 | |

### 6. Cau hinh Database (neu dung)

Tao database va bang `posts` se duoc tu dong tao khi chay lan dau.
Them bai dang bang SQL:

```sql
INSERT INTO posts (title, content, image_url, platforms, status, scheduled_time)
VALUES ('Tieu de', 'Noi dung bai dang...', 'https://image.url/img.jpg', 'facebook,linkedin', 'pending', '2026-08-20 09:00:00');
```

## Su dung

### Kiem tra token truoc khi chay

```bash
python main.py verify
```

### Chay 1 lan

```bash
python main.py once
```

### Chay hang ngay (mac dinh 09:00)

```bash
python main.py daily
```

### Chay hang gio (mac dinh moi 60 phut)

```bash
python main.py hourly
```

### Chay bang Windows Task Scheduler

1. Mo Task Scheduler
2. Tao Basic Task
3. Action: `Start a program`
4. Program: `python`
5. Arguments: `C:\MCNA\tu_dong_db\main.py once`
6. Dat lich theo nhu cau

## Ghi chu

- `CONTENT_SOURCE` trong `.env`: `google_sheets`, `database`, hoac `both`
- Bai dang co `status = pending` va `scheduled_time <= now()` moi duoc dang
- Sau khi dang, status chuyen thanh `posted` (hoac `failed` neu loi)
- Tat ca log duoc ghi vao `logs/workflow.log`
