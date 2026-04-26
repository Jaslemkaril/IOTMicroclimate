@echo off
echo ========================================
echo   TerraSync ESP32 Firmware Flasher
echo ========================================
echo.
echo Cleaning previous build...
platformio run --target clean
echo.
echo Building and uploading firmware...
platformio run --target upload
echo.
echo ========================================
echo   Upload complete!
echo ========================================
echo.
echo Press any key to start serial monitor...
pause >nul
echo.
echo Starting serial monitor (Ctrl+C to exit)...
platformio device monitor --baud 115200
