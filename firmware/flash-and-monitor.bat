@echo off
echo ========================================
echo  TerraSync - Flash and Monitor ESP32
echo ========================================
echo.
echo Flashing firmware to COM3...
pio run --target upload --upload-port COM3
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Flash failed!
    echo Make sure:
    echo   1. ESP32 is connected to COM3
    echo   2. No other program is using COM3
    echo   3. Press the BOOT button on ESP32 if needed
    pause
    exit /b 1
)
echo.
echo ========================================
echo  Flash successful! Starting monitor...
echo ========================================
echo.
echo Press Ctrl+C to stop monitoring
echo.
pio device monitor --port COM3 --baud 115200
