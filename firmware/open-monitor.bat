@echo off
echo ========================================
echo  Opening ESP32 Serial Monitor
echo ========================================
echo.
echo Closing any programs using COM3...
taskkill /F /IM "pio.exe" 2>nul
taskkill /F /IM "python.exe" 2>nul
timeout /t 2 /nobreak >nul

echo Opening Serial Monitor on COM3...
echo.
echo Instructions:
echo 1. Watch for [Relay] messages
echo 2. Toggle pump ON in dashboard
echo 3. Toggle pump OFF in dashboard
echo 4. Press Ctrl+C to stop
echo.
pio device monitor --port COM3 --baud 115200
