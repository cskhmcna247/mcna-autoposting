# Auto Posting MCNA (autoposting.mcna.vn)

Workflow tu dong dang bai len Facebook Page va LinkedIn. Dashboard quan ly (React) + backend
API (FastAPI) + du lieu luu tren Supabase (bang `posts`).

> ⚠️ **Canh bao bao mat**: `setup_token.py` tung hardcode App Secret va access token Facebook
> truc tiep trong source — da duoc sua de doc tu bien moi truong (`FB_APP_SECRET`,
> `FB_SHORT_TOKEN`). App Secret cu da bi lo qua lich su chat da duoc reset tren Facebook
> Developers. `.env`, `config/google_credentials.json` va `Backup-codes-*.txt` chua bi mat —
> khong duoc push len repo public.

## Tinh trang source (2026-10-05)

Da hoan thien day du: `src/` (workflow logic), `server/app.py` (backend FastAPI),
`frontend/src/` (React dashboard). Facebook va LinkedIn da duoc test dang bai thanh cong
voi credentials that trong `.env`.

| Thanh phan | Trang thai |
|---|---|
| `main.py` (CLI: once/daily/hourly/verify) | Hoat dong, dung `src.*` |
| `src/` (config_loader, workflow, content_sources/database, social_media/{facebook,linkedin}) | Hoan thien, chi ho tro `CONTENT_SOURCE=database` (Supabase) |
| `server/app.py` (FastAPI, port 8000) | Hoan thien — CRUD `/api/posts` + `/api/posts/{id}/publish` |
| `frontend/src/` (React + Vite + Tailwind) | Hoan thien — 1 trang: danh sach + form + dang ngay |
| `supabase_migration.sql` | Can tu chay tren Supabase SQL Editor truoc khi dung (bang `posts` chua chac da ton tai) |
| `config/users.json` | Rong `[]` — dashboard **khong co dang nhap** trong ban nay |

**Ngoai pham vi (chua trien khai)**: dang nhap/role, nguon Google Sheets, dang bai len
WordPress (bien env `WORDPRESS_*` van giu trong `.env` nhung khong duoc workflow su dung).

## Kien truc

```
tu_dong_db/
├── main.py                          # CLI: python main.py [once|daily|hourly|verify]
├── requirements.txt
├── .env                             # Cau hinh that (KHONG commit)
├── supabase_migration.sql           # Chay tren Supabase SQL Editor truoc khi dung
├── config/
│   ├── google_credentials.json      # (khong dung trong ban nay, giu lai phong khi can Google Sheets sau)
│   └── users.json
├── server/
│   └── app.py                       # FastAPI: GET/POST/PUT/DELETE /api/posts, POST /api/posts/{id}/publish
├── src/
│   ├── config_loader.py             # Doc .env, setup_logging()
│   ├── supabase_client.py           # Supabase client dung chung
│   ├── workflow.py                  # run_workflow(), publish_post()
│   ├── content_sources/database.py  # CRUD bang `posts` tren Supabase
│   └── social_media/{facebook_poster,linkedin_poster}.py
├── frontend/
│   └── src/{main.jsx,App.jsx,api.js,components/{PostList,PostForm}.jsx}
└── logs/workflow.log
```

## Nguon du lieu bai dang (Supabase)

Bang `posts` (xem `supabase_migration.sql`): `title, content, image_url, platforms, status,
scheduled_time, posted_at, error_message`.

- `platforms`: chuoi phan cach dau phay, vd `facebook,linkedin`.
- Bai dang co `status=pending` va `scheduled_time <= now()` moi duoc workflow dang; sau khi
  dang status chuyen `posted` (co `posted_at`) hoac `failed` (co `error_message`).
- Dashboard cho phep dang thu cong ngay qua nut "Dang ngay" (goi `/api/posts/{id}/publish`),
  khong can doi scheduler.

## Bien moi truong (`.env`)

```
# Facebook
FACEBOOK_PAGE_ID=
FACEBOOK_ACCESS_TOKEN=          # Page Access Token long-lived

# LinkedIn
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_PERSON_URN=            # hoac LINKEDIN_ORG_URN cho company page
LINKEDIN_ORG_URN=

# Supabase (nguon du lieu bai dang)
SUPABASE_URL=
SUPABASE_KEY=                   # anon key la du cho CRUD co RLS phu hop

# Scheduler
SCHEDULE_DAILY_TIME=09:00
SCHEDULE_HOURLY_INTERVAL=60

CONTENT_SOURCE=database         # chi gia tri nay duoc ho tro hien tai

LOG_LEVEL=INFO
```

## Chay local

```bash
pip install -r requirements.txt
```

Chay `supabase_migration.sql` tren Supabase SQL Editor (tao bang `posts` neu chua co).

```bash
# Kiem tra token truoc khi chay that
python main.py verify

# Chay 1 lan / theo lich hang ngay / theo lich hang gio
python main.py once
python main.py daily
python main.py hourly
```

Dashboard:

```bash
# Backend — port 8000
python -m uvicorn server.app:app --reload --port 8000

# Frontend — port 5173 (proxy /api sang :8000, xem frontend/vite.config.js)
cd frontend && npm install && npm run dev
```

Hoac dung `start.bat` (Windows) de mo ca hai cung luc.

## Checklist deploy len `autoposting.mcna.vn` (VPS)

1. **Chay `supabase_migration.sql`** tren Supabase that truoc khi deploy.
2. **DNS**: tao A record `autoposting.mcna.vn` -> IP VPS.
3. **Nginx**: reverse proxy `/` -> `frontend/dist` (sau khi `npm run build`),
   `/api` -> backend FastAPI noi bo (vd `127.0.0.1:8000`).
4. **SSL**: Certbot/Let's Encrypt cho subdomain.
5. **Runtime tren VPS**: Python 3.10+ va Node.js (de build frontend).
6. **Process manager (pm2)**:
   - `pm2 start "uvicorn server.app:app --port 8000" --name autoposting-api`
   - Scheduler: `pm2 start "python main.py hourly" --name autoposting-worker`
     (hoac `daily`; khong chay ca `hourly` va `daily` cung luc de tranh dang trung bai).
7. **Bien moi truong**: copy `.env` that truc tiep len server (khong qua git).
8. **Frontend production API URL**: `vite.config.js` chi proxy `/api` luc dev
   (`localhost:8000`). Khi deploy, Nginx dam nhan route `/api` -> backend, frontend build
   (`npm run build`) khong can doi gi vi goi relative path `/api/...`.
9. **`config/users.json`**: dashboard hien khong co dang nhap — neu can bao ve truy cap,
   dat sau Nginx basic auth hoac VPN noi bo truoc khi public subdomain.

## Ghi chu

- Tat ca log ghi vao `logs/workflow.log`.
- Cac script `find_page_id.py`, `setup_token.py`, `test_facebook.py`, `test_linkedin.py`,
  `create_sheet.py` la cong cu chay tay mot lan khi setup, khong phai mot phan cua workflow
  production.
