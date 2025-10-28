@echo off
echo ============================================
echo  JiraLogger Pro - Local Development Setup
echo ============================================
echo.

echo This script will help you set up local development.
echo You need TWO terminal windows running simultaneously:
echo.
echo   Terminal 1: Next.js Dev Server (npm run dev)
echo   Terminal 2: Forge Tunnel (forge tunnel)
echo.
echo ============================================
echo.

REM Check if Forge CLI is installed
where forge >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Forge CLI is not installed!
    echo.
    echo Please install it first:
    echo   npm install -g @forge/cli
    echo.
    echo Then run: forge login
    echo.
    pause
    exit /b 1
)

echo [OK] Forge CLI is installed
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
    echo.
)

echo ============================================
echo  NEXT STEPS:
echo ============================================
echo.
echo 1. Open TWO PowerShell/CMD windows
echo.
echo 2. In Terminal 1, run:
echo    npm run dev
echo.
echo 3. In Terminal 2, run:
echo    forge tunnel
echo.
echo 4. Follow the forge tunnel prompts to install to your Jira site
echo.
echo 5. Access JiraLogger Pro from your Jira site
echo.
echo ============================================
echo.
echo TIP: Read LOCAL_DEVELOPMENT.md for detailed instructions
echo.
pause
