@echo off
REM ========================================
REM Update Data Only - Scrape and Classify
REM ========================================

echo.
echo ========================================
echo Updating data from Ed Stem...
echo ========================================
echo.

REM Set API Token
set ED_API_TOKEN=pq9uwR.DpVAoXrpjSLYgIJ4I6jtDubsST5Oas6zRql2nzg7

REM Navigate to scripts directory
cd /d "%~dp0scripts"

REM Check dependencies
echo [1/3] Checking dependencies...
python -c "import edapi" >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)
echo.

REM Scrape data
echo [2/3] Scraping data from Ed Stem...
echo This may take a few minutes...
python scrape_ed.py
if errorlevel 1 (
    echo [ERROR] Scraping failed!
    pause
    exit /b 1
)
echo.

REM Filter and classify
echo [3/3] Filtering and classifying Special Participation E...
python filter_and_classify_e.py
if errorlevel 1 (
    echo [ERROR] Classification failed!
    pause
    exit /b 1
)
echo.

REM Back to root
cd /d "%~dp0"

REM Show results
echo ========================================
echo Update Complete!
echo ========================================
python -c "import json; data=json.load(open('data/articles.json', encoding='utf-8')); print(f'\nTotal articles: {len(data)}\n'); subcats = {}; [subcats.update({a.get('subcategory', 'Unknown'): subcats.get(a.get('subcategory', 'Unknown'), 0) + 1}) for a in data]; print('Subcategories:'); [print(f'  {k}: {v}') for k, v in sorted(subcats.items(), key=lambda x: -x[1])]"
echo.
echo Data updated successfully!
echo You can now run quick-start.bat to launch the website
echo.
pause
