@echo off
title AI Tutor Platform Launcher
cd /d "%~dp0"

echo =======================================================
echo    Launching AI Tutor Platform (Backend + Frontend)
echo =======================================================

:: Verify Python Virtual Environment
if not exist ".\venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found at .\venv\
    echo Please run: python -m venv venv and pip install -r backend\requirements.txt
    pause
    exit /b 1
)

:: Verify Frontend dependencies
if not exist ".\frontend\node_modules" (
    echo [INFO] Installing frontend npm packages...
    cd frontend && npm install && cd ..
)

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "AI Tutor - Backend (FastAPI)" cmd /k "cd /d ""%~dp0"" && .\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload-dir backend --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "AI Tutor - Frontend (React/Vite)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo Both servers started! Opening browser at http://localhost:5173 in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
