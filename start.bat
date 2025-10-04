@echo off
echo Starting School Ranking Application...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not installed or not in PATH
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if data files exist
if not exist "RESU_CAS_2025.xlsx" (
    echo Warning: RESU_CAS_2025.xlsx not found
)
if not exist "RESU_BREVET_2025.xlsx" (
    echo Warning: RESU_BREVET_2025.xlsx not found
)
if not exist "RESU_BAC_2025.csv" (
    echo Warning: RESU_BAC_2025.csv not found
)

echo.
echo Starting the application...
echo The application will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

REM Start the application
npm start

pause



