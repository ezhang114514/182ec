@echo off
REM ========================================
REM EECS182 Special Participation E Website
REM Red Team - Automated Setup and Launch
REM ========================================

echo.
echo ========================================
echo EECS182 Special Participation E Website
echo Red Team - Starting...
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://www.python.org/
    pause
    exit /b 1
)

echo [OK] Python found
echo.

REM Set API Token
set ED_API_TOKEN="YOUR_ED_API_TOKEN_HERE"

REM Navigate to scripts directory
cd /d "%~dp0scripts"

REM Check if dependencies are installed
echo ========================================
echo Step 1: Checking dependencies...
echo ========================================
python -c "import edapi" >nul 2>&1
if errorlevel 1 (
    echo [*] Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)
echo.

REM Ask user what to do
echo ========================================
echo Step 2: Data Options
echo ========================================
echo What would you like to do?
echo.
echo [1] Use existing data (skip scraping)
echo [2] Scrape fresh data from Ed Stem
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="2" (
    echo.
    echo ========================================
    echo Step 3: Scraping data from Ed Stem...
    echo ========================================
    python scrape_ed.py
    if errorlevel 1 (
        echo [ERROR] Scraping failed
        pause
        exit /b 1
    )
    echo [OK] Data scraped successfully
    echo.

    echo ========================================
    echo Step 4: Filtering and classifying...
    echo ========================================
    python filter_and_classify_e.py
    if errorlevel 1 (
        echo [ERROR] Classification failed
        pause
        exit /b 1
    )
    echo [OK] Data filtered and classified
    echo.
) else (
    echo.
    echo [*] Using existing data...
    echo.
)

REM Navigate back to project root
cd /d "%~dp0"

REM Check if data file exists
if not exist "data\articles.json" (
    echo [ERROR] data\articles.json not found
    echo Please run option 2 to scrape data first
    pause
    exit /b 1
)

REM Show statistics
echo ========================================
echo Data Statistics:
echo ========================================
python -c "import json; data=json.load(open('data/articles.json', encoding='utf-8')); print(f'Total articles: {len(data)}'); subcats = {}; [subcats.update({a.get('subcategory', 'Unknown'): subcats.get(a.get('subcategory', 'Unknown'), 0) + 1}) for a in data]; print('\nSubcategories:'); [print(f'  {k}: {v}') for k, v in sorted(subcats.items(), key=lambda x: -x[1])]"
echo.

REM Kill any existing servers on port 8000
echo ========================================
echo Step 5: Cleaning up old servers...
echo ========================================
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo [*] Stopping process %%a
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Port 8000 is clean
echo.

REM Start the server
echo ========================================
echo Step 6: Starting web server...
echo ========================================
echo.
echo Server will start on: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

timeout /t 2 >nul

REM Start server and open browser
start http://localhost:8000
python -m http.server 8000

REM This line will execute when server is stopped
echo.
echo ========================================
echo Server stopped
echo ========================================
pause
