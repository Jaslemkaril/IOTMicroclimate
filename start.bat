@echo off
title TerraSync — IoT Farming Dashboard
cd /d "%~dp0"
color 0A

echo.
echo  ================================================
echo   TerraSync  ^|  Smart IoT Farming Dashboard
echo  ================================================
echo.

:: ── Check MySQL is running ─────────────────────────────────
tasklist /fi "imagename eq mysqld.exe" 2>nul | find /i "mysqld.exe" >nul
if errorlevel 1 (
    echo  [!] MySQL does not appear to be running.
    echo      Please start MySQL first:
    echo        ^> XAMPP Control Panel ^> Start MySQL
    echo        ^> or: net start mysql
    echo.
    echo  Press any key to continue anyway, or Ctrl+C to exit.
    echo  (Server will show a DB error if MySQL is not running.)
    pause >nul
    echo.
)

:: ── Install dependencies if missing ────────────────────────
if not exist "node_modules" (
    echo  Installing Node.js dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo  [!] npm install failed. Make sure Node.js is installed:
        echo      https://nodejs.org/
        pause
        exit /b 1
    )
    echo.
)

:: ── Open browser after 3 seconds (background) ──────────────
start "" /b powershell -NoProfile -WindowStyle Hidden -Command ^
  "Start-Sleep 3; Start-Process 'http://localhost:3000'"

:: ── Start server (runs in this window) ─────────────────────
echo  Starting server...  (Ctrl+C to stop)
echo.
node server/index.js

:: ── If server exits ────────────────────────────────────────
echo.
echo  Server stopped.
pause
