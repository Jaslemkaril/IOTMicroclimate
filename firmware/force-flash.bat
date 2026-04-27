@echo off
echo ========================================
echo  Force Flash ESP32 (Closes COM3 users)
echo ========================================
echo.

REM Kill common programs that might be using COM3
echo Closing programs that might be using COM3...
taskkill /F /IM "pio.exe" 2>nul
taskkill /F /IM "python.exe" 2>nul
taskkill /F /IM "arduino.exe" 2>nul
taskkill /F /IM "putty.exe" 2>nul

echo Waiting 2 seconds for port to release...
timeout /t 2 /nobreak >nul

echo.
echo Flashing firmware to COM3...
pio run --target upload --upload-port COM3

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  Flash successful!
    echo ========================================
    echo.
    echo Starting Serial Monitor...
    echo Press Ctrl+C to stop
    echo.
    timeout /t 2 /nobreak >nul
    pio device monitor --port COM3 --baud 115200
) else (
    echo.
    echo ========================================
    echo  Flash FAILED!
    echo ========================================
    echo.
    echo Troubleshooting:
    echo 1. Unplug ESP32 USB cable
    echo 2. Wait 3 seconds
    echo 3. Plug it back in
    echo 4. Run this script again
    echo.
    pause
)
