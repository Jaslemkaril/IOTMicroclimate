# TerraSync — Complete Setup Guide

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18 + | [nodejs.org](https://nodejs.org/) |
| MySQL | 8.0 + | via XAMPP *(already installed)* |
| VS Code + PlatformIO | latest | [platformio.org](https://platformio.org/install/ide?install=vscode) |
| CP2102 / CH340 Driver | — | supplied with your ESP32 board |

---

## Part 1 — Server Setup (do this first, before hardware)

### Step 1 — Start MySQL
Open **XAMPP Control Panel** ? click **Start** next to MySQL.

### Step 2 — Start TerraSync
Double-click **`start.bat`** in the project root.

It will automatically:
- Install Node.js dependencies (first run only)
- Initialize the database and seed data
- Start the API server on port 3000
- Open your browser to `http://localhost:3000`

### Step 3 — Note your LAN IP
When the server starts, look for this block in the terminal:

```
¦  ?? ESP32 config.h  ?  SERVER_BASE_URL:          ¦
¦      "http://192.168.1.XX:3000"                  ¦
```

Copy that URL — you will paste it into `config.h` in Part 2.

---

## Part 2 — Hardware Wiring

### Components

| # | Component | Notes |
|---|-----------|-------|
| 1 | ESP32 Dev Module | 30-pin or 38-pin |
| 2 | DHT22 sensor | Temperature + Humidity |
| 3 | Capacitive soil moisture sensor | Analog out to ADC |
| 4 | 5V single-channel relay module | Active LOW |
| 5 | 12V submersible water pump | Connected through relay |
| 6 | 12V DC power supply | For pump |
| 7 | Breadboard + jumper wires | |

### Wiring Diagram

```
                    +--------------+
                    ¦   ESP32      ¦
                    ¦              ¦
    DHT22 DATA -----¦ GPIO 4       ¦
    DHT22 VCC  -----¦ 3.3V        ¦
    DHT22 GND  -----¦ GND         ¦
                    ¦              ¦
    MOISTURE OUT ---¦ GPIO 34 (A) ¦  ? ADC1 channel only
    MOISTURE VCC ---¦ 3.3V        ¦
    MOISTURE GND ---¦ GND         ¦
                    ¦              ¦
    RELAY IN   -----¦ GPIO 26      ¦
    RELAY VCC  -----¦ 5V (VIN)    ¦
    RELAY GND  -----¦ GND         ¦
                    +--------------+

    RELAY COM ------------ 12V (+) from power supply
    RELAY NO  ------------ Pump (+) wire
                           Pump (-) wire -- 12V (-) from power supply
```

> **Safety:** The relay isolates the 12V pump from the ESP32.
> Never connect the pump directly to ESP32 GPIO pins.

---

## Part 3 — Firmware Configuration

### Step 4 — Open the firmware
In VS Code open the **`firmware/`** folder in PlatformIO
*(File ? Open Folder ? select `Microclimate/firmware`)*

### Step 5 — Edit `firmware/include/config.h`

Open the file and fill in the two marked sections:

```cpp
// STEP 1 — your WiFi router credentials
#define WIFI_SSID       "YourWiFiName"
#define WIFI_PASSWORD   "YourWiFiPassword"

// STEP 2 — the URL printed by the server at startup
#define SERVER_BASE_URL "http://192.168.1.XX:3000"
```

Everything else is pre-configured for the default wiring above.

---

## Part 4 — Flash & Go

### Step 6 — Plug in USB
Connect the ESP32 to your PC with a USB cable.
PlatformIO automatically detects the COM port.

### Step 7 — Upload firmware
In VS Code click the **? Upload** button in the PlatformIO toolbar
*(or press `Ctrl+Alt+U`, or run `pio run --target upload` in the firmware/ folder).*

The firmware compiles and flashes (~30 seconds on first run).

### Step 8 — Open Serial Monitor
Click the **plug icon** in the PlatformIO toolbar (115200 baud).

You should see:
```
=== TerraSync ESP32 Firmware ===
[WiFi] Connecting to YourWiFiName...
[WiFi] Connected — IP: 192.168.1.XX
[Sensor] Temp: 27.5°C  Humidity: 68.0%  Moisture: 42%
[HTTP]  POST /api/sensors ? 201 Created
[Pump]  Status from server: OFF
```

### Step 9 — View live data
Open `http://localhost:3000` — the dashboard now shows real sensor readings.

---

## Soil Moisture Calibration

The defaults work reasonably well, but calibrating gives accurate 0–100 % readings:

1. Hold the sensor **in dry air** ? open Serial Monitor ? note the raw ADC value
2. Submerge the sensor **in water** ? note the raw ADC value
3. Update `firmware/include/config.h`:
   ```cpp
   #define MOISTURE_DRY_ADC  3400   // ? replace with your dry value
   #define MOISTURE_WET_ADC   800   // ? replace with your wet value
   ```
4. Re-flash

You can also preview values without reflashing using **Settings ? Hardware ? Soil Moisture Calibration** in the dashboard.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED` in server log | MySQL not running | XAMPP ? Start MySQL |
| `[WiFi] Failed to connect` | Wrong SSID/password | Double-check `config.h` STEP 1 |
| `POST /api/sensors ? -1` | Wrong server IP | Copy IP shown at server startup |
| `POST /api/sensors ? 404` | Wrong port or URL | Verify `SERVER_BASE_URL` in `config.h` |
| Moisture always 0 % or 100 % | Needs calibration | See calibration section above |
| `DHT read failed` in serial | Bad wiring or pin | Check DHT22 ? GPIO 4, add 10 kO pull-up |
| COM port not detected | Missing USB driver | Install CH340 or CP2102 driver for your board |
| Port 3000 already in use | Old server instance | Task Manager ? end `node.exe`, then `start.bat` again |

---

## API Endpoints

| Method | Endpoint | Used by |
|--------|----------|---------|
| `POST` | `/api/sensors` | ESP32 sends readings every 10 s |
| `GET`  | `/api/sensors/latest` | Dashboard sensor cards |
| `GET`  | `/api/sensors/history?field_id=1&range=24h` | Charts |
| `GET`  | `/api/fields` | Field list |
| `GET`  | `/api/alerts?limit=20` | Alert panel |
| `PUT`  | `/api/alerts/read-all` | Mark all read button |
| `PUT`  | `/api/alerts/:id/read` | Dismiss single alert |
| `POST` | `/api/pump/toggle` | Pump ON/OFF button |
| `GET`  | `/api/pump/status` | ESP32 polls every 5 s |
| `GET`  | `/api/pump/today` | Today water usage stat |
| `GET`  | `/api/health` | Connection status badge |

---

## Project Structure

```
Microclimate/
+-- start.bat               ? Double-click to start everything
+-- SETUP.md                ? This file
+-- index.html              ? Dashboard (single-page app)
+-- css/style.css
+-- js/app.js
+-- .env                    ? DB credentials (edit if MySQL password set)
+-- package.json
+-- firmware/
¦   +-- platformio.ini
¦   +-- include/
¦   ¦   +-- config.h        ? ? ? EDIT THIS BEFORE FLASHING
¦   +-- src/
¦       +-- main.cpp
+-- server/
    +-- index.js
    +-- db/
    ¦   +-- connection.js
    ¦   +-- schema.sql
    ¦   +-- init.js
    +-- routes/
        +-- sensors.js
        +-- fields.js
        +-- alerts.js
        +-- pump.js
```
