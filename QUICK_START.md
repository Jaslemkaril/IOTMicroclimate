# 🚀 Quick Start: Multi-Zone Soil Moisture System

## ✅ Everything is Ready - Just 3 Steps!

---

## Step 1: Update Database (1 minute)

Run this migration on your Railway MySQL database:

```bash
# File: server/db/migrations/add_multi_zone_moisture.sql
# This adds 4 new columns for the moisture sensors
```

**Via Railway Dashboard:**
1. Go to Railway → Your Project → MySQL
2. Click "Query" tab
3. Copy/paste the migration SQL
4. Click "Execute"

**Done!** ✅ Database now supports 4 sensors

---

## Step 2: Deploy to Railway (automatic)

Already done! Your push triggered automatic deployment.

**Check deployment:**
1. Go to Railway dashboard
2. Wait for "Deployed" status
3. Open your dashboard URL

**Done!** ✅ Backend & frontend deployed

---

## Step 3: Flash ESP32 & Connect Sensors (5 minutes)

### A. Flash Firmware

```bash
cd firmware
pio run --target upload
```

### B. Wire 4 Moisture Sensors

```
Sensor 1 → GPIO 34 (Zone A - Northwest)
Sensor 2 → GPIO 35 (Zone B - Northeast)
Sensor 3 → GPIO 32 (Zone C - Southwest)
Sensor 4 → GPIO 33 (Zone D - Southeast)

Each sensor:
  VCC  → 3.3V
  GND  → GND
  AOUT → GPIO pin
```

### C. Power On & Verify

```bash
# Open serial monitor
pio device monitor -b 115200

# You should see:
[Sensor] Zone A: 45%  Zone B: 58%  Zone C: 48%  Zone D: 62%
[HTTP]  POST /api/sensors → 201 Created
```

**Done!** ✅ ESP32 sending 4-zone data

---

## 🎉 That's It!

Open your dashboard and you'll see:

```
╔═══════════════════════════════════════╗
║  💧 SOIL MOISTURE - FIELD AVERAGE     ║
╠═══════════════════════════════════════╣
║              52%                      ║
║                                       ║
║  Zone A (NW)  ████████░░  45%  ⚠️    ║
║  Zone B (NE)  ██████████  58%  ✓     ║
║  Zone C (SW)  ███████░░░  48%  ⚠️    ║
║  Zone D (SE)  ███████████  62%  ✓     ║
║                                       ║
║  ⚠️ 2 zones need attention            ║
╚═══════════════════════════════════════╝
```

---

## 🔍 Verify Everything Works

- [ ] Dashboard shows multi-zone moisture card
- [ ] All 4 zones display with progress bars
- [ ] Summary shows irrigation recommendations
- [ ] Serial monitor shows zone readings
- [ ] Chart shows 4 separate lines

---

## 🐛 Quick Troubleshooting

**Problem**: Dashboard still shows old single-sensor card  
**Fix**: Hard refresh browser (Ctrl+Shift+R)

**Problem**: Zones show 0%  
**Fix**: Check sensor wiring and GPIO pins

**Problem**: Database error  
**Fix**: Run migration script again

---

## 📚 Full Documentation

See `MULTI_ZONE_SETUP_GUIDE.md` for:
- Detailed wiring diagrams
- Calibration instructions
- Advanced troubleshooting
- Testing procedures

---

**Ready to impress your professor!** 🎓✨
