@echo off
REM ========================================
REM Quick Start - Just launch the website
REM ========================================

echo Starting EECS182 Website...

REM Kill any existing servers
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Navigate to project directory
cd /d "%~dp0"

REM Open browser
start http://localhost:8000

REM Start server
echo.
echo Server running on http://localhost:8000
echo Press Ctrl+C to stop
echo.
python -m http.server 8000
