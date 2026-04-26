# ⚡ FLASH ESP32 NOW - Quick Guide

## 🚀 3 Simple Steps

### Step 1: Open Command Prompt in Firmware Folder

**Option A: From File Explorer**
1. Open File Explorer
2. Navigate to: `C:\xampp\htdocs\IOTMicroclimate\firmware`
3. Click in the address bar
4. Type `cmd` and press Enter

**Option B: From Current Terminal**
```bash
cd C:\xampp\htdocs\IOTMicroclimate\firmware
```

---

### Step 2: Run the Flash Script

**Just double-click this file:**
```
flash-esp32.bat
```

**Or type in command prompt:**
```bash
flash-esp32.bat
```

---

### Step 3: Watch the Output

You'll see:
```
========================================
  TerraSync ESP32 Firmware Flasher
========================================

Cleaning previous build...
Building and uploading firmware...
Uploading .pio\build\esp32dev\firmware.bin
Writing at 0x00010000... (100%)
Wrote 847872 bytes

========================================
  Upload complete!
========================================

Press any key to start serial monitor...
```

**Press any key** to see the serial monitor.

---

## 📊 What to Look For in Serial Monitor

### ✅ Success Looks Like This:

```
=== TerraSync ESP32 Firmware ===
[WiFi] Connecting to Redmi...
[WiFi] Connected! IP: 192.168.43.123 RSSI: -68 dBm
[Sensor] Temp: 27.5°C  Humidity: 62%  Moisture Avg: 52%
[Sensor] Zone A: 45%  Zone B: 58%  Zone C: 48%  Zone D: 62%
[HTTP]  Sending sensor data...
[HTTP]  POST /api/sensors → 201 Created ✓
[Pump]  Status check → 200 OK
```

### ⚠️ Slow Connection (Still Working):

```
[HTTP]  Sending sensor data...
[HTTP]  POST /api/sensors → -1 (Read Timeout)
[HTTP]  RSSI: -75 dBm
[HTTP]  Retrying due to slow connection...
[HTTP]  Retry successful ✓
```

### ❌ Problem (Connection Too Weak):

```
[WiFi] Failed to connect
[HTTP]  POST /api/sensors → -1 (Connection Lost)
[HTTP]  RSSI: -85 dBm
```

---

## 🎯 After Flashing

1. **Wait 30 seconds**
2. **Open dashboard**: https://iotmicroclimate-production.up.railway.app
3. **Hard refresh**: Ctrl+Shift+R
4. **Check status**: Should show "ESP32 Online"

---

## 🐛 Troubleshooting

### Problem: "Port not found"

**Solution:**
1. Check USB cable is connected
2. Try different USB port
3. Install CP210x driver from: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

### Problem: "Permission denied"

**Solution:**
1. Close any open serial monitors
2. Close Arduino IDE if open
3. Try again

### Problem: "Timed out waiting for packet header"

**Solution:**
1. Hold BOOT button on ESP32
2. Run flash script
3. Release BOOT when you see "Connecting..."

---

## 📱 Quick Commands

### Just Flash (No Monitor):
```bash
cd firmware
pio run --target upload
```

### Just Monitor (After Flash):
```bash
cd firmware
pio device monitor -b 115200
```

### Flash + Monitor (All in One):
```bash
cd firmware
flash-esp32.bat
```

---

## ✅ Success Checklist

After flashing, you should see:

- [ ] "Upload complete!" message
- [ ] WiFi connected with IP address
- [ ] RSSI signal strength shown
- [ ] HTTP POST → 201 Created
- [ ] Dashboard shows "ESP32 Online"
- [ ] Sensor data appears (4 zones)

---

## 🎉 That's It!

**The firmware is now updated with:**
- ✅ 15 second HTTP timeout
- ✅ Automatic retry on timeout
- ✅ Slower updates (15s sensors, 8s pump)
- ✅ Signal strength monitoring
- ✅ Better error messages

**Your ESP32 should now work with slow internet!** 🚀

---

## 📞 Need Help?

If you see errors, copy the serial monitor output and share it so I can help diagnose the issue!
