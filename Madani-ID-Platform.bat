@echo off
title Madani ID Platform - Desktop Launcher
color 0A
echo =========================================================
echo       MADANI ENTERPRISES ID PLATFORM - LAUNCHER
echo =========================================================
echo.

cd /d "%~dp0"

:: 1. Check if backend is running on port 8000
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [INFO] Starting Madani Backend Service...
    start /min "Madani Backend" cmd /c "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
) else (
    echo [INFO] Madani Backend Service is already running.
)

:: 2. Check if frontend is running on port 3000
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [INFO] Starting Madani Frontend Service...
    start /min "Madani Frontend" cmd /c "cd frontend && npm run dev"
) else (
    echo [INFO] Madani Frontend Service is already running.
)

echo [INFO] Initializing Madani ID Platform workspace...
timeout /t 3 /nobreak >nul

:: 3. Open in Windows Native App Window Mode (Edge or Chrome with standalone window)
set "APP_URL=http://localhost:3000/login"
set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_EXE%" set "EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

if exist "%EDGE_EXE%" (
    echo [INFO] Opening in Native Desktop Application mode via Edge...
    start "" "%EDGE_EXE%" --app=%APP_URL% --window-size=1280,820
    exit /b 0
)

if exist "%CHROME_EXE%" (
    echo [INFO] Opening in Native Desktop Application mode via Chrome...
    start "" "%CHROME_EXE%" --app=%APP_URL% --window-size=1280,820
    exit /b 0
)

echo [INFO] Opening in default web browser...
start "" "%APP_URL%"
exit /b 0
