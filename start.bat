@echo off
title Auto Posting Dashboard
echo === Khoi dong Auto Posting Dashboard ===

cd /d C:\MCNA\tu_dong_db

echo [1] Dang khoi dong Backend (port 8000)...
start "Backend" cmd /k "cd /d C:\MCNA\tu_dong_db && python -m uvicorn server.app:app --reload --port 8000"

echo [2] Dang khoi dong Frontend (port 5173)...
start "Frontend" cmd /k "cd /d C:\MCNA\tu_dong_db\frontend && npm run dev"

timeout /t 5 >nul
echo.
echo === Dashboard da san sang ===
echo Mo trinh duyet: http://localhost:5173
start http://localhost:5173
