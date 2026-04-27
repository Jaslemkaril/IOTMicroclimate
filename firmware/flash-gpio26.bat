@echo off
echo ========================================
echo  Flashing GPIO26 Configuration
echo ========================================
echo.
echo IMPORTANT: After flashing, you need to:
echo 1. Move the wire from GPIO25 to GPIO26
echo 2. Test the pump toggle
echo.
pause

echo Killing processes...
taskkill /F /IM "pio.exe" 2>nul
taskkill /F /IM "python.exe" 2>nul
timeout /t 2 /nobreak >nul

echo Flashing firmware...
pio run --target upload --upload-port COM3

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  SUCCESS! Firmware flashed
    echo ========================================
    echo.
    echo NOW DO THIS:
    echo 1. Move the wire from ESP32 GPIO25 to GPIO26
    echo 2. Open Serial Monitor: .\force-monitor.bat
    echo 3. Toggle pump ON/OFF in dashboard
    echo 4. Check if pump turns OFF properly
    echo.
    pause
) else (
    echo.
    echo FAILED!
    pause
)
