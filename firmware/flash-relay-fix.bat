@echo off
echo ========================================
echo  Flashing Relay Logic Fix
echo ========================================
echo.
echo This will fix the inverted relay behavior
echo (pump ON when it should be OFF)
echo.

echo Killing processes...
taskkill /F /IM "pio.exe" 2>nul
taskkill /F /IM "python.exe" 2>nul
timeout /t 2 /nobreak >nul

echo Flashing firmware...
pio run --target upload --upload-port COM3

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  SUCCESS! Relay logic fixed
    echo ========================================
    echo.
    echo Now test:
    echo 1. Pump should be OFF by default
    echo 2. Toggle ON in dashboard - pump turns ON
    echo 3. Toggle OFF in dashboard - pump turns OFF
    echo.
    pause
) else (
    echo.
    echo FAILED - COM3 is still busy
    echo Please close the Serial Monitor window and try again
    echo.
    pause
)
