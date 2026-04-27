@echo off
echo ========================================
echo  Force Open Serial Monitor
echo ========================================
echo.

echo Step 1: Killing all processes that might use COM3...
taskkill /F /IM "pio.exe" 2>nul
taskkill /F /IM "python.exe" 2>nul
taskkill /F /IM "python3.exe" 2>nul
taskkill /F /IM "arduino.exe" 2>nul
taskkill /F /IM "putty.exe" 2>nul
taskkill /F /IM "Code.exe" 2>nul

echo.
echo Step 2: Waiting 3 seconds for port to release...
timeout /t 3 /nobreak >nul

echo.
echo Step 3: Opening Serial Monitor...
echo ========================================
echo  INSTRUCTIONS:
echo  1. Toggle pump ON in dashboard
echo  2. Wait 2 seconds
echo  3. Toggle pump OFF in dashboard
echo  4. Look for [Relay] messages
echo  5. Press Ctrl+C when done
echo ========================================
echo.

pio device monitor --port COM3 --baud 115200

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo  FAILED TO OPEN COM3
    echo ========================================
    echo.
    echo Solution:
    echo 1. Close VS Code completely
    echo 2. Unplug ESP32 USB cable
    echo 3. Wait 5 seconds
    echo 4. Plug ESP32 back in
    echo 5. Run this script again
    echo.
    pause
)
