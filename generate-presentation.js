/**
 * TerraSync — Presentation Generator
 * Run: node generate-presentation.js
 * Reads live source files and writes PRESENTATION.txt with current values.
 */

const fs   = require('fs');
const path = require('path');

// ── Helpers ────────────────────────────────────────────────────────────────
function readFile(rel) {
    try { return fs.readFileSync(path.join(__dirname, rel), 'utf8'); }
    catch { return ''; }
}

function parseDefine(src, name) {
    const m = src.match(new RegExp(`^#define\\s+${name}\\s+(.+)`, 'm'));
    return m ? m[1].replace(/\/\/.*/, '').trim().replace(/['"]/g, '') : 'N/A';
}

function msToSec(val) {
    const n = parseInt(val);
    return isNaN(n) ? val : `${n / 1000}s`;
}

// ── Read source files ──────────────────────────────────────────────────────
const config  = readFile('firmware/include/config.h');
const mainCpp = readFile('firmware/src/main.cpp');
const pkg     = JSON.parse(readFile('package.json') || '{}');
const schema  = readFile('server/db/schema.sql');
const routes  = {
    sensors : readFile('server/routes/sensors.js'),
    pump    : readFile('server/routes/pump.js'),
    tank    : readFile('server/routes/tank.js'),
    alerts  : readFile('server/routes/alerts.js'),
    fields  : readFile('server/routes/fields.js'),
};

// ── Extract values from config.h ───────────────────────────────────────────
const cfg = {
    ssid          : parseDefine(config, 'WIFI_SSID'),
    serverUrl     : parseDefine(config, 'SERVER_BASE_URL'),
    fieldId       : parseDefine(config, 'FIELD_ID'),
    dhtPin        : parseDefine(config, 'DHT_PIN'),
    dhtType       : parseDefine(config, 'DHT_TYPE'),
    moisturePin   : parseDefine(config, 'MOISTURE_PIN'),
    relayPin      : parseDefine(config, 'PUMP_RELAY_PIN'),
    relayActiveLow: parseDefine(config, 'RELAY_ACTIVE_LOW'),
    flowPin       : parseDefine(config, 'FLOW_PIN'),
    flowCal       : parseDefine(config, 'FLOW_CALIBRATION'),
    sensorInterval: msToSec(parseDefine(config, 'SENSOR_INTERVAL')),
    pumpInterval  : msToSec(parseDefine(config, 'PUMP_POLL_INTERVAL')),
    dryAdc        : parseDefine(config, 'MOISTURE_DRY_ADC'),
    wetAdc        : parseDefine(config, 'MOISTURE_WET_ADC'),
};

// ── Extract API routes from route files ────────────────────────────────────
function extractRoutes(src, prefix) {
    const lines = [];
    const re = /router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        lines.push(`  ${m[1].toUpperCase().padEnd(6)} ${prefix}${m[2]}`);
    }
    return lines.join('\n');
}

// ── Extract DB tables from schema.sql ─────────────────────────────────────
const tables = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)]
    .map(m => `  • ${m[1]}`).join('\n');

// ── Count sensor chart ranges ──────────────────────────────────────────────
const chartRanges = [...routes.sensors.matchAll(/case ['"](\w+)['"]/g)]
    .map(m => m[1]).concat(['live']).filter((v,i,a)=>a.indexOf(v)===i);

// ── Generated date ─────────────────────────────────────────────────────────
const now = new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'full',
    timeStyle: 'short'
});

// ── Build presentation text ────────────────────────────────────────────────
const txt = `
╔══════════════════════════════════════════════════════════════════════════════╗
║              TerraSync — Smart IoT Precision Farming System                ║
║                       Mock Defense Presentation                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

  Generated: ${now}
  Version  : ${pkg.version || '1.0.0'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. SYSTEM OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  TerraSync is a real-time IoT precision farming dashboard. An ESP32
  microcontroller collects soil moisture, temperature, humidity, and water
  flow data and sends it to a Node.js/MySQL backend via WiFi every
  ${cfg.sensorInterval}. A web dashboard at localhost:3000 displays live sensor
  trends, controls irrigation, and tracks water tank levels.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  2. HARDWARE COMPONENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Microcontroller   : ESP32 (dual-core, WiFi/BT)
  Temperature/Humid : ${cfg.dhtType} sensor                → GPIO ${cfg.dhtPin}
  Soil Moisture     : Capacitive sensor (ADC)           → GPIO ${cfg.moisturePin}
                      Dry ADC: ${cfg.dryAdc}   |   Wet ADC: ${cfg.wetAdc}
  Water Flow        : YF-S201 flow meter                → GPIO ${cfg.flowPin}
                      Calibration: ${cfg.flowCal} pulses/sec per L/min
  Relay (Pump)      : 1-channel relay module            → GPIO ${cfg.relayPin}
                      Logic: ${cfg.relayActiveLow === 'true' ? 'Active-LOW (LOW = ON)' : 'Active-HIGH (HIGH = ON)'}
  Water Pump        : DC submersible pump via relay COM/NO
  Field             : Jaslem Farm (Field ID: ${cfg.fieldId})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  3. FIRMWARE (ESP32)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Platform          : PlatformIO / Arduino framework
  WiFi SSID         : ${cfg.ssid}
  Server URL        : ${cfg.serverUrl}
  Sensor post rate  : Every ${cfg.sensorInterval}   (POST /api/sensors)
  Pump poll rate    : Every ${cfg.pumpInterval}  (GET  /api/pump/status)

  Data Flow:
    ESP32 reads sensors → builds JSON payload → HTTP POST to Node.js API
    ESP32 polls pump status → drives relay GPIO HIGH/LOW accordingly

  DHT22 reliability : 3-retry loop with 500ms gap + INPUT_PULLUP
  Flow formula      : L/min = (pulses ÷ elapsed_sec) ÷ ${cfg.flowCal}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  4. BACKEND (Node.js / Express / MySQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Runtime     : Node.js  |  Framework: Express ${pkg.dependencies?.express || ''}
  Database    : MySQL (XAMPP)  |  Driver: mysql2 ${pkg.dependencies?.mysql2 || ''}
  Port        : 3000

  Database Tables:
${tables}

  API Endpoints:
${extractRoutes(routes.sensors, '/api/sensors')}
${extractRoutes(routes.pump,    '/api/pump')}
${extractRoutes(routes.tank,    '/api/tank')}
${extractRoutes(routes.alerts,  '/api/alerts')}
${extractRoutes(routes.fields,  '/api/fields')}

  Background Worker:
    Tank flow integration runs every 10s — reads new flow sensor readings,
    deducts consumed volume from tank_state, fires low/critical alerts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  5. DASHBOARD FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Live Sensor Cards   : Soil Moisture, Temperature, Humidity, Water Flow
                        Updated every ${cfg.sensorInterval} — shows delta vs previous reading
  Sensor Trend Chart  : Chart.js line chart with ranges: ${chartRanges.join(' | ')}
                        Live mode auto-refreshes every 3 seconds
  CSV Export          : Download sensor history — This Hour / Today / This Week
  Irrigation Control  : Manual toggle → sends ON/OFF to server → ESP32 polls
                        and drives relay within ${cfg.pumpInterval}
  Water Tank Gauge    : Circular SVG ring showing tank level (7L capacity)
                        Usable volume = Total − Pipe dead volume (0.63L)
                        Auto-alerts at low (≤1.5L) and critical (≤0.63L)
  Crop Health Score   : Computed from live sensor data
                        Base 50 + moisture factor (±20) + temp (±20) + humidity (±10)
  Field Management    : Jaslem Farm — status computed from real sensor values
  Alerts System       : Read/unread alerts with badge counter
  ESP32 Status Badge  : Online/Offline — polls /api/health every 15s
  Offline Capable     : All CDN assets (Chart.js, Font Awesome) served locally

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  6. NETWORK SETUP (School Presentation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Laptop creates Windows Mobile Hotspot
  ESP32 connects to hotspot SSID: ${cfg.ssid}
  Windows hotspot always assigns: 192.168.137.1 to the host PC
  ESP32 posts data to           : ${cfg.serverUrl}
  Dashboard accessed at         : http://localhost:3000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  7. STARTUP CHECKLIST (Day of Defense)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [ ] Turn on Windows Mobile Hotspot (SSID: ${cfg.ssid})
  [ ] Run start.bat (starts XAMPP MySQL + Node.js server)
  [ ] Power on ESP32 — watch Serial Monitor for "Connected"
  [ ] Open http://localhost:3000 in browser
  [ ] Verify ESP32 Online badge is green in top bar
  [ ] Check all 4 sensor cards show LIVE badge
  [ ] Test pump toggle from dashboard (relay clicks within ${cfg.pumpInterval})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  8. TECHNOLOGY STACK SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Hardware   : ESP32, DHT22, Capacitive Moisture, YF-S201, Relay, DC Pump
  Firmware   : C++ / Arduino / PlatformIO / ArduinoJson / HTTPClient
  Backend    : Node.js / Express / MySQL2 / CORS / dotenv
  Frontend   : HTML5 / CSS3 / Vanilla JS / Chart.js / Font Awesome
  Database   : MySQL 8 (XAMPP)
  Network    : WiFi (Windows Mobile Hotspot) / REST API / JSON
  Offline    : All vendor assets bundled locally (no internet required)

──────────────────────────────────────────────────────────────────────────────
  To regenerate this file after any changes:
    node generate-presentation.js
──────────────────────────────────────────────────────────────────────────────
`.trimStart();

// ── Write output ───────────────────────────────────────────────────────────
const outPath = path.join(__dirname, 'PRESENTATION.txt');
fs.writeFileSync(outPath, txt, 'utf8');
console.log('✓ PRESENTATION.txt generated successfully.');
console.log(`  ${outPath}`);
