@echo off
echo ========================================
echo  RELAY DIAGNOSTIC TEST
echo ========================================
echo.
echo This will test your relay to find the correct configuration
echo.
pause

echo Closing programs...
taskkill /F /IM "pio.exe" 2>nul
taskkill /F /IM "python.exe" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Opening Arduino IDE...
echo.
echo INSTRUCTIONS:
echo 1. In Arduino IDE, open: firmware\test-relay-simple.ino
echo 2. Select Board: "ESP32 Dev Module"
echo 3. Select Port: COM3
echo 4. Click Upload
echo 5. Open Serial Monitor (115200 baud)
echo 6. Watch the test and note:
echo    - When GPIO25 = HIGH: Is pump ON or OFF?
echo    - When GPIO25 = LOW: Is pump ON or OFF?
echo 7. Tell me the results
echo.
pause

start arduino
