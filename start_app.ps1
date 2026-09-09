# AI Tutor Platform One-Click PowerShell Launcher
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
if ($ScriptRoot) { Set-Location $ScriptRoot }

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   🚀 Launching AI Tutor Platform (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Verify Virtual Environment
$PythonExe = Join-Path $ScriptRoot "venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    Write-Host "[ERROR] Virtual environment not found at .\venv\" -ForegroundColor Red
    Write-Host "Please run: python -m venv venv and pip install -r backend\requirements.txt" -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}

# 2. Start Backend FastAPI
Write-Host "Starting FastAPI Backend at http://localhost:8000..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory $ScriptRoot -ArgumentList "-NoExit", "-Command", "& '$PythonExe' -m uvicorn app.main:app --app-dir backend --reload-dir backend --host 127.0.0.1 --port 8000 --reload"

# 3. Start Frontend Vite
$FrontendDir = Join-Path $ScriptRoot "frontend"
Write-Host "Starting React/Vite Frontend at http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -WorkingDirectory $FrontendDir -ArgumentList "-NoExit", "-Command", "npm run dev"

# 4. Open browser after brief delay
Start-Sleep -Seconds 3
Write-Host "Opening web application in your default browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"
