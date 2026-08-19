# AI Tutor Platform One-Click PowerShell Launcher
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   🚀 Launching AI Tutor Platform (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Start Backend FastAPI
Write-Host "Starting FastAPI Backend at http://localhost:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload"

# 2. Start Frontend Vite
Write-Host "Starting React/Vite Frontend at http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

# 3. Open browser after brief delay
Start-Sleep -Seconds 3
Write-Host "Opening web application in your default browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"
