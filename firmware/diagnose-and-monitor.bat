@echo off
echo ========================================
echo  Flash and Monitor - Relay Diagnosis
echo ========================================
echo.

echo Step 1: Killing processes...
taskkill /F /IM "pio.exe" 2>nul
taskkill /F /IM "python.exe" 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Flashing firmware...
pio run --target upload --upload-port COM3

if %errorlevel% neq 0 (
    echo FLASH FAILED!
    pause
    exit /b 1
)

echo.
echo Step 3: Opening Serial Monitor...
echo ========================================
echo  WATCH FOR THESE MESSAGES:
echo  [Relay] GPIO25 → LOW (pump ON)
echo  [Relay] GPIO25 → HIGH (pump OFF)
echo  [Pump] State changed: OFF → ON
echo  [Pump] State changed: ON → OFF
echo ========================================
echo.
timeout /t 2 /nobreak >nul

pio device monitor --port COM3 --baud 115200
