@echo off
title AI Tutor Platform Launcher
echo =======================================================
echo    Launching AI Tutor Platform (Backend + Frontend)
echo =======================================================

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "AI Tutor - Backend (FastAPI)" cmd /k ".\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "AI Tutor - Frontend (React/Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers started! Opening browser at http://localhost:5173 in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
