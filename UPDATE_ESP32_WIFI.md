# 📡 Update ESP32 WiFi Credentials

## Changes Made

**New WiFi Settings:**
- SSID: `Arduino0`
- Password: `01020304`

**Flow Sensor:**
- Disabled (set to -1) since you don't have the YF-S201 sensor yet

---

## How to Flash ESP32

### **Option 1: Using PlatformIO (Recommended)**

1. **Open Terminal in firmware folder:**
   ```bash
   cd firmware
   ```

2. **Flash the ESP32:**
   ```bash
   pio run --target upload --upload-port COM3
   ```

3. **Monitor Serial Output:**
   ```bash
   pio device monitor --port COM3 --baud 115200
   ```

### **Option 2: Using the Batch File**

1. **Double-click:**
   ```
   firmware/flash-esp32.bat
   ```

2. **Wait for upload to complete**

3. **Check serial monitor for:**
   ```
   [WiFi] Connecting to Arduino0...
   [WiFi] Connected — IP: 192.168.x.x
   ```

---

## Verify Connection

After flashing, check the dashboard:

1. **ESP32 Status Badge** (top right) should show:
   - "ESP32 Online" (green dot)

2. **Sensor values** should update every 2 seconds

3. **Serial Monitor** should show:
   ```
   [WiFi] Connected — IP: 192.168.x.x  Gateway: 192.168.x.1  RSSI: -45 dBm
   [HTTP]  POST /api/sensors → 201 Created ✓
   [Sensor] Temp: 28.5°C  Humidity: 65%  Moisture Avg: 45%  Flow: 0.00 L/min
   ```

---

## Troubleshooting

### **ESP32 Won't Connect**

1. **Check hotspot is on:**
   - SSID: Arduino0
   - Password: 01020304
   - **Must be 2.4GHz** (ESP32 doesn't support 5GHz)

2. **Check serial monitor for errors:**
   ```bash
   pio device monitor --port COM3 --baud 115200
   ```

3. **Common issues:**
   - Wrong password → Check for typos
   - 5GHz network → Switch to 2.4GHz
   - Weak signal → Move ESP32 closer to hotspot

### **Sensors Show 0 or --**

1. **Check ESP32 is connected** (green badge)
2. **Wait 5-10 seconds** for first reading
3. **Check serial monitor** for sensor values
4. **Verify wiring:**
   - DHT22 → GPIO4
   - Moisture sensors → GPIO34, 35, 32, 33

---

## What Changed in config.h

```cpp
// OLD:
#define WIFI_SSID       "Redmi"
#define WIFI_PASSWORD   "collen12345"
#define FLOW_PIN         21

// NEW:
#define WIFI_SSID       "Arduino0"
#define WIFI_PASSWORD   "01020304"
#define FLOW_PIN         -1  // Disabled (no sensor)
```

---

## Next Steps

1. ✅ Flash ESP32 with new WiFi credentials
2. ✅ Verify connection on dashboard
3. ✅ Check sensor readings are updating
4. ⏳ (Optional) Add YF-S201 flow sensor later
5. ⏳ Test irrigation with real water

---

## Notes

- **config.h is in .gitignore** for security (WiFi passwords shouldn't be in git)
- You need to flash ESP32 manually after changing WiFi settings
- Flow sensor is disabled to prevent garbage readings
- When you get the YF-S201 sensor, change `FLOW_PIN` back to `21`
