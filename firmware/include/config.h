#pragma once

// ============================================================
//  TerraSync — Hardware Configuration
//
//  BEFORE FLASHING:  Fill in STEP 1 and STEP 2 below.
//  Everything else works out of the box for the default
//  wiring diagram (see SETUP.md).
// ============================================================


// ────────────────────────────────────────────────────────────
//  STEP 1 — WiFi Credentials
//  Enter your router's SSID and password.
// ────────────────────────────────────────────────────────────
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"


// ────────────────────────────────────────────────────────────
//  STEP 2 — Server IP
//  Run start.bat on your PC first. It will print the exact
//  line to paste here, e.g.:
//    #define SERVER_BASE_URL "http://192.168.1.10:3000"
//
//  ⚠ Use YOUR_PC_IP, NOT "localhost" — the ESP32 cannot
//    reach localhost; it needs the LAN IP shown at startup.
// ────────────────────────────────────────────────────────────
#define SERVER_BASE_URL "http://YOUR_PC_IP:3000"


// ────────────────────────────────────────────────────────────
//  STEP 3 (Optional) — Field ID
//  Must match a row in the `fields` table (default = 1).
// ────────────────────────────────────────────────────────────
#define FIELD_ID        1


// ============================================================
//  Hardware pin mapping  (default wiring — see SETUP.md)
//  Only change if you used different GPIO pins.
// ============================================================

// DHT22 — temperature & humidity sensor
#define DHT_PIN          4          // GPIO4  — data wire
#define DHT_TYPE         DHT22      // DHT11 or DHT22

// Capacitive soil moisture sensor
#define MOISTURE_PIN     34         // GPIO34 — analog out (ADC1 only: 32–39)

// Relay module controlling the water pump
#define PUMP_RELAY_PIN   26         // GPIO26 — relay IN
#define RELAY_ACTIVE_LOW true       // true = most relay boards; false = active-HIGH


// ============================================================
//  Timing  (milliseconds)
// ============================================================
#define SENSOR_INTERVAL    10000UL  // Send sensor data every 10 s
#define PUMP_POLL_INTERVAL  5000UL  // Check pump command every  5 s


// ============================================================
//  Soil moisture calibration
//  Hold the sensor in dry air  → note ADC value → MOISTURE_DRY_ADC
//  Submerge the sensor in water → note ADC value → MOISTURE_WET_ADC
//  Open Serial Monitor at 115200 baud to read raw ADC values.
// ============================================================
#define MOISTURE_DRY_ADC  3400      // Raw ADC in completely dry air
#define MOISTURE_WET_ADC   800      // Raw ADC fully submerged in water
