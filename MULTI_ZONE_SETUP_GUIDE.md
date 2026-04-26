# 🌱 Multi-Zone Soil Moisture System - Setup Guide

## ✅ Plug-and-Play Implementation Complete!

Your TerraSync dashboard now supports **4 soil moisture sensors** with a professional multi-zone display!

---

## 📦 What's Included

### 1. **Database Schema** ✅
- Added `moisture_1`, `moisture_2`, `moisture_3`, `moisture_4` columns
- Automatic migration script for existing databases
- Backward compatible with single-sensor setups

### 2. **Backend API** ✅
- Accepts 4 individual moisture readings
- Calculates average automatically
- Zone-specific low moisture alerts
- Returns all 4 values to dashboard

### 3. **Frontend Dashboard** ✅
- Professional multi-zone display card
- Color-coded progress bars for each zone
- Status indicators (✓ optimal, ⚠️ low, ⚡ high)
- Smart summary with irrigation recommendations
- Responsive design for mobile

### 4. **ESP32 Firmware** ✅
- Reads 4 moisture sensors simultaneously
- Sends all 4 values + average to server
- Serial monitor shows all zone readings
- Plug-and-play wiring configuration

---

## 🔌 Hardware Wiring

### ESP32 Pin Connections

```
┌─────────────────────────────────────────────┐
│  SENSOR          ESP32 PIN    DESCRIPTION   │
├─────────────────────────────────────────────┤
│  Moisture 1  →   GPIO 34      Zone A (NW)   │
│  Moisture 2  →   GPIO 35      Zone B (NE)   │
│  Moisture 3  →   GPIO 32      Zone C (SW)   │
│  Moisture 4  →   GPIO 33      Zone D (SE)   │
│  DHT22       →   GPIO 4       Temp/Humidity │
│  Relay       →   GPIO 25      Pump Control  │
│  Flow Sensor →   GPIO 27      (Optional)    │
└─────────────────────────────────────────────┘
```

### Moisture Sensor Wiring (Each Sensor)

```
Sensor Pin    →    ESP32
─────────────────────────
VCC (Red)     →    3.3V
GND (Black)   →    GND
AOUT (Yellow) →    GPIO 34/35/32/33
```

**Important Notes:**
- Use **ADC1 pins only** (GPIO 32-39) for analog sensors
- All 4 sensors share the same 3.3V and GND rails
- Keep sensor wires short (<30cm) to reduce noise
- Calibrate each sensor individually for best accuracy

---

## 🚀 Deployment Steps

### Step 1: Update Database Schema

Run the migration script on your Railway MySQL database:

```bash
# Option A: Via Railway CLI
railway run mysql -u root -p terrasync < server/db/migrations/add_multi_zone_moisture.sql

# Option B: Via MySQL Workbench
# 1. Connect to your Railway MySQL database
# 2. Open server/db/migrations/add_multi_zone_moisture.sql
# 3. Execute the script
```

**What it does:**
- Adds 4 new columns: `moisture_1`, `moisture_2`, `moisture_3`, `moisture_4`
- Migrates existing data (copies `moisture` to all 4 zones)
- No data loss, fully backward compatible

### Step 2: Deploy Backend & Frontend

```bash
# Commit and push to Railway
git add .
git commit -m "feat: Multi-zone soil moisture system with 4 sensors"
git push origin main
```

**Railway will automatically:**
- Deploy updated backend API
- Deploy updated frontend dashboard
- Restart the server with new code

### Step 3: Flash ESP32 Firmware

```bash
# Navigate to firmware folder
cd firmware

# Upload firmware to ESP32
pio run --target upload

# Monitor serial output (optional)
pio device monitor -b 115200
```

**What you'll see in serial monitor:**
```
[WiFi] Connected — IP: 192.168.x.x
[Sensor] Temp: 27.5°C  Humidity: 62%  Moisture Avg: 52%  Flow: 0.00 L/min
[Sensor] Zone A: 45%  Zone B: 58%  Zone C: 48%  Zone D: 62%
[HTTP]  POST /api/sensors → 201 Created
```

---

## 🎨 Dashboard Features

### Multi-Zone Display Card

```
╔═══════════════════════════════════════════════╗
║  💧 SOIL MOISTURE - FIELD AVERAGE             ║
╠═══════════════════════════════════════════════╣
║                                               ║
║                  52%                          ║
║              ▼ 2% from yesterday              ║
║                                               ║
║  Zone A (NW)  ████████░░░░  45%  ⚠️          ║
║  Zone B (NE)  ██████████░░  58%  ✓           ║
║  Zone C (SW)  ███████░░░░░  48%  ⚠️          ║
║  Zone D (SE)  ███████████░  62%  ✓           ║
║                                               ║
║  ⚠️ 2 zones need attention — irrigate A & C   ║
║                                               ║
║  ⚙️ 4x Capacitive Sensors • Live              ║
╚═══════════════════════════════════════════════╝
```

### Color Coding

- **🟢 Green (Optimal)**: 40-60% moisture
- **🟡 Yellow (Low)**: <40% moisture - needs water
- **🔵 Blue (High)**: >60% moisture - well watered

### Status Indicators

- **✓** = Optimal moisture level
- **⚠️** = Low moisture - irrigation needed
- **⚡** = High moisture - recently watered

### Smart Summary

The dashboard automatically analyzes all zones and provides actionable recommendations:

- **All optimal**: "All zones optimal — no irrigation needed"
- **Some low**: "2 zones need attention — irrigate Zones A & C"
- **All low**: "All zones need water — start irrigation immediately"

---

## 📊 Chart Updates

The sensor trend chart now shows **4 separate lines** for each moisture zone:

- **Blue line**: Zone A (NW)
- **Green line**: Zone B (NE)
- **Orange line**: Zone C (SW)
- **Purple line**: Zone D (SE)

This lets you track moisture trends for each zone over time!

---

## 🔧 Configuration

### Sensor Calibration

Each sensor can be calibrated individually in `firmware/include/config.h`:

```cpp
// Default calibration (works for most sensors)
#define MOISTURE_DRY_ADC  3400  // Sensor in dry air
#define MOISTURE_WET_ADC   800  // Sensor in water
```

**To calibrate:**
1. Open serial monitor at 115200 baud
2. Hold sensor in **dry air** → note ADC value
3. Submerge sensor in **water** → note ADC value
4. Update `MOISTURE_DRY_ADC` and `MOISTURE_WET_ADC`
5. Re-flash firmware

### Zone Labels

Zone labels are fixed in the dashboard:
- **Zone A (NW)** = Northwest corner of field
- **Zone B (NE)** = Northeast corner of field
- **Zone C (SW)** = Southwest corner of field
- **Zone D (SE)** = Southeast corner of field

Place your sensors accordingly for best coverage!

---

## 🧪 Testing

### Test 1: Verify Sensor Readings

1. Open serial monitor: `pio device monitor -b 115200`
2. Check that all 4 zones show different values
3. Touch a sensor → value should change

**Expected output:**
```
[Sensor] Zone A: 45%  Zone B: 58%  Zone C: 48%  Zone D: 62%
```

### Test 2: Verify Dashboard Display

1. Open dashboard in browser
2. Check that soil moisture card shows 4 zones
3. Each zone should have a progress bar and percentage
4. Summary should show irrigation recommendations

### Test 3: Verify Alerts

1. Submerge one sensor in water (>60%)
2. Hold another sensor in dry air (<40%)
3. Check alerts panel for zone-specific warnings

---

## 🐛 Troubleshooting

### Problem: All zones show 0%

**Cause**: Sensors not connected or wrong pins

**Solution**:
1. Check wiring (VCC, GND, AOUT)
2. Verify GPIO pins in `config.h` match your wiring
3. Check serial monitor for ADC readings

### Problem: Zones show same value

**Cause**: Sensors not properly separated or wiring issue

**Solution**:
1. Verify each sensor is connected to a different GPIO pin
2. Check for short circuits between sensor wires
3. Test each sensor individually

### Problem: Dashboard shows "Waiting for sensor data"

**Cause**: ESP32 not sending data or database migration not run

**Solution**:
1. Check ESP32 is connected (serial monitor)
2. Run database migration script
3. Restart Railway server

### Problem: Some zones show "—"

**Cause**: Sensor disconnected or firmware issue

**Solution**:
1. Check sensor wiring for that specific zone
2. Verify GPIO pin is correct in `config.h`
3. Re-flash firmware

---

## 📱 Mobile Responsive

The multi-zone display is fully responsive:

- **Desktop**: Full width card with all zones visible
- **Tablet**: Stacked layout with readable bars
- **Mobile**: Compact view with touch-friendly controls

---

## 🎓 For Your Professor

This implementation demonstrates:

✅ **Scalable sensor architecture** - Easy to add more sensors  
✅ **Real-time multi-point monitoring** - 4 simultaneous readings  
✅ **Intelligent irrigation recommendations** - Zone-specific alerts  
✅ **Professional data visualization** - Color-coded progress bars  
✅ **Database normalization** - Proper schema design  
✅ **API design** - RESTful endpoints with validation  
✅ **Embedded systems** - ESP32 multi-sensor integration  
✅ **Full-stack development** - Frontend, backend, firmware, database

---

## 📈 Future Enhancements

Want to expand further? Here are some ideas:

1. **8 Sensors**: Add 4 more zones (GPIO 36, 39, 25, 26)
2. **Heatmap View**: Visual 2D grid showing moisture distribution
3. **Zone-Specific Irrigation**: Control 4 separate pumps/valves
4. **Machine Learning**: Predict irrigation needs based on patterns
5. **Mobile App**: Native iOS/Android app with push notifications

---

## ✅ Verification Checklist

Before presenting to your professor:

- [ ] Database migration completed successfully
- [ ] Backend deployed to Railway (check logs)
- [ ] Frontend shows multi-zone card
- [ ] ESP32 firmware flashed and running
- [ ] All 4 sensors connected and reading
- [ ] Serial monitor shows zone readings
- [ ] Dashboard displays all 4 zones with bars
- [ ] Summary shows irrigation recommendations
- [ ] Chart shows 4 separate moisture lines
- [ ] Alerts work for individual zones
- [ ] Mobile view is responsive

---

## 🎉 You're All Set!

Your multi-zone soil moisture system is now **plug-and-play** ready!

**Next Steps:**
1. Run database migration
2. Push code to Railway
3. Flash ESP32 firmware
4. Connect 4 moisture sensors
5. Watch the magic happen! ✨

**Need help?** Check the troubleshooting section or review the serial monitor output.

---

**Built with ❤️ for precision agriculture** 🌱💧
