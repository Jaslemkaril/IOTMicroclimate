# TerraSync — 4-Plant Multi-Sensor Setup

This guide explains how to configure TerraSync to monitor 4 separate plants, each with its own soil moisture sensor and ESP32.

---

## Overview

- **4 ESP32 boards** — one per plant
- **4 soil moisture sensors** — one per plant
- **1 shared DHT22** (optional) — or each ESP32 can have its own
- **1 shared pump/relay** (optional) — controlled by any ESP32
- **1 backend server** — Railway or local
- **1 dashboard** — shows all 4 plants in the Field Status Overview

---

## Step 1: Seed the Database with 4 Plant Fields

Run this command **once** to create 4 plant fields in your database:

```bash
node server/db/seed-plants.js
```

This will:
- Clear existing fields (Jaslem Farm, Mak)
- Create 4 new fields:
  - **Plant-A** (field_id: 1) — Sensor 1
  - **Plant-B** (field_id: 2) — Sensor 2
  - **Plant-C** (field_id: 3) — Sensor 3
  - **Plant-D** (field_id: 4) — Sensor 4

---

## Step 2: Flash Each ESP32 with a Unique FIELD_ID

Each ESP32 needs to know which plant it's monitoring. You'll flash the same firmware 4 times, changing only the `FIELD_ID` in `config.h`.

### For ESP32 #1 (Plant-A):
```cpp
// firmware/include/config.h
#define FIELD_ID  1
```

### For ESP32 #2 (Plant-B):
```cpp
#define FIELD_ID  2
```

### For ESP32 #3 (Plant-C):
```cpp
#define FIELD_ID  3
```

### For ESP32 #4 (Plant-D):
```cpp
#define FIELD_ID  4
```

**Flashing workflow:**
1. Open `firmware/include/config.h`
2. Set `FIELD_ID` to `1`
3. Flash ESP32 #1 (PlatformIO → Upload)
4. Label the board "Plant-A" with tape/marker
5. Change `FIELD_ID` to `2`
6. Flash ESP32 #2
7. Label it "Plant-B"
8. Repeat for Plant-C and Plant-D

---

## Step 3: Wire Each ESP32

Each ESP32 gets:
- **1 soil moisture sensor** → GPIO 34 (analog)
- **1 DHT22** (optional, can be shared) → GPIO 4
- **Power** → USB or 5V supply

### Wiring per ESP32:
```
Soil Moisture Sensor:
  VCC  → 3.3V
  GND  → GND
  OUT  → GPIO 34

DHT22 (optional):
  VCC  → 3.3V
  GND  → GND
  DATA → GPIO 4
```

If you only have 1 DHT22, connect it to ESP32 #1 (Plant-A) and leave the others without DHT22. The firmware will send `null` for temperature/humidity on boards without DHT22.

---

## Step 4: Power On and Verify

1. Power all 4 ESP32 boards
2. Open Serial Monitor (115200 baud) on each to confirm WiFi connection
3. Open the dashboard at your Railway URL or `http://localhost:3000`
4. Check **Field Status Overview** — you should see 4 rows:
   - Plant-A with live moisture %
   - Plant-B with live moisture %
   - Plant-C with live moisture %
   - Plant-D with live moisture %

---

## Step 5: Calibrate Soil Moisture (Optional)

For accurate 0-100% readings, calibrate each sensor:

1. Hold sensor in **dry air** → note the raw ADC value in Serial Monitor
2. Submerge sensor in **water** → note the raw ADC value
3. Update `config.h` for that ESP32:
   ```cpp
   #define MOISTURE_DRY_ADC  3400  // your dry value
   #define MOISTURE_WET_ADC   800  // your wet value
   ```
4. Re-flash that ESP32

Repeat for all 4 sensors (each may have slightly different values).

---

## Dashboard Features

- **Field Status Overview** — shows all 4 plants with real-time moisture, temp, humidity
- **Field Health Analysis** — doughnut chart with health score for each plant
- **Sensor Trend Chart** — select a plant from the dropdown to view its history
- **Alerts** — low moisture alerts are per-plant (e.g., "Plant-C moisture below 20%")

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Dashboard shows only 1 plant | Run `node server/db/seed-plants.js` again |
| ESP32 posts to wrong field | Check `FIELD_ID` in `config.h` and re-flash |
| Moisture always 0% or 100% | Calibrate `MOISTURE_DRY_ADC` and `MOISTURE_WET_ADC` |
| Temperature shows `—` | DHT22 not connected or wrong pin |
| All 4 plants show same data | All ESP32s have the same `FIELD_ID` — re-flash with unique IDs |

---

## Advanced: Rename Plants

To change "Plant-A" to a real plant name (e.g., "Tomato"), edit `server/db/seed-plants.js`:

```js
const plants = [
  { name: 'Tomato',   crop: 'Sensor 1', icon: 'fa-seedling' },
  { name: 'Lettuce',  crop: 'Sensor 2', icon: 'fa-leaf' },
  { name: 'Basil',    crop: 'Sensor 3', icon: 'fa-cannabis' },
  { name: 'Cucumber', crop: 'Sensor 4', icon: 'fa-spa' }
];
```

Then run `node server/db/seed-plants.js` again.

---

## Summary

✅ 4 fields in database (Plant-A, Plant-B, Plant-C, Plant-D)  
✅ 4 ESP32 boards, each with unique `FIELD_ID`  
✅ 4 soil moisture sensors  
✅ Dashboard shows all 4 plants with live data  
✅ Health score computed per-plant based on moisture + temp  

You're all set! 🌱
