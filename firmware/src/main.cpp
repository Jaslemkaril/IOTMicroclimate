/* ============================================================
   TerraSync — ESP32 Firmware
   Reads DHT22 (temperature + humidity) and a capacitive/
   resistive soil-moisture sensor, then POSTs the values to
   the TerraSync Node.js API every SENSOR_INTERVAL ms.
   Also polls /api/pump/status and drives a relay accordingly.
   ============================================================ */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#include "config.h"

// ── Globals ──────────────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);

// Shared secure client for HTTPS (Railway). setInsecure() skips cert verification
// so the ESP32 can connect without embedding a root CA. Acceptable for IoT-to-cloud.
WiFiClientSecure secureClient;
bool secureReady = false;

unsigned long lastSensorPost = 0;
unsigned long lastPumpPoll   = 0;
unsigned long lastNetProbe   = 0;

// Track last known pump state to detect changes
bool lastPumpState = false;

// ── Flow sensor (YF-S201) ────────────────────────────────────
volatile uint32_t flowPulseCount = 0;
unsigned long     flowLastCalc   = 0;
float             flowRate_lpm   = 0.0f;

void IRAM_ATTR flowPulseISR() {
    flowPulseCount++;
}

// ── Forward declarations ─────────────────────────────────────
void connectWiFi();
void probeServerConnectivity();
void postSensorData();
void pollPumpStatus();
int  readMoisturePercent();
float readFlowRate();
void setPump(bool on);
void setPumpForce(bool on);

// ─────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    Serial.println("\n=== TerraSync ESP32 Firmware ===");

    // Relay pin — set safe state before anything else
    pinMode(PUMP_RELAY_PIN, OUTPUT);
    setPumpForce(false); // Force OFF on boot

    // DHT22 needs INPUT_PULLUP and ~3s to stabilize after power-on
    pinMode(DHT_PIN, INPUT_PULLUP);
    dht.begin();
    delay(3000);

    // Flow sensor interrupt on rising edge
    // Only attach if a valid pin is configured (set FLOW_PIN to -1 to disable)
    if (FLOW_PIN >= 0) {
        pinMode(FLOW_PIN, INPUT_PULLUP);
        attachInterrupt(digitalPinToInterrupt(FLOW_PIN), flowPulseISR, RISING);
    }
    flowLastCalc = millis();

    connectWiFi();
}

// ─────────────────────────────────────────────────────────────
void loop() {
    // Reconnect if WiFi dropped
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WiFi] Connection lost — reconnecting…");
        connectWiFi();
    }

    unsigned long now = millis();

    if (now - lastSensorPost >= SENSOR_INTERVAL) {
        lastSensorPost = now;
        postSensorData();
    }

    if (now - lastPumpPoll >= PUMP_POLL_INTERVAL) {
        lastPumpPoll = now;
        pollPumpStatus();
    }

    // Periodic network probe helps diagnose LAN routing/firewall behavior.
    if (now - lastNetProbe >= 30000UL) {
        lastNetProbe = now;
        probeServerConnectivity();
    }
}

// ─────────────────────────────────────────────────────────────
//  WiFi
// ─────────────────────────────────────────────────────────────
void connectWiFi() {
    Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    uint8_t tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 30) {
        delay(500);
        Serial.print('.');
        tries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Connected — IP: %s  Gateway: %s  RSSI: %d dBm\n",
                      WiFi.localIP().toString().c_str(),
                      WiFi.gatewayIP().toString().c_str(),
                      WiFi.RSSI());
        probeServerConnectivity();
    } else {
        Serial.println("\n[WiFi] Failed to connect. Will retry in next loop.");
    }
}

// ─────────────────────────────────────────────────────────────
//  One-shot TCP probe to pinpoint LAN path issues.
//  It checks the configured server port and port 80 on the same host.
// ─────────────────────────────────────────────────────────────
void probeServerConnectivity() {
    String base = String(SERVER_BASE_URL);
    bool isHttps = base.startsWith("https://");

    int hostStart = base.indexOf("://");
    hostStart = (hostStart >= 0) ? hostStart + 3 : 0;

    int pathSep = base.indexOf('/', hostStart);
    if (pathSep < 0) pathSep = base.length();

    int portSep = base.indexOf(':', hostStart);
    String host;
    int configuredPort = isHttps ? 443 : 80;

    if (portSep > 0 && portSep < pathSep) {
        host = base.substring(hostStart, portSep);
        configuredPort = base.substring(portSep + 1, pathSep).toInt();
    } else {
        host = base.substring(hostStart, pathSep);
    }

    bool cfgOk = false;
    if (isHttps) {
        if (!secureReady) { secureClient.setInsecure(); secureReady = true; }
        cfgOk = secureClient.connect(host.c_str(), configuredPort);
        if (cfgOk) secureClient.stop();
    } else {
        WiFiClient client;
        cfgOk = client.connect(host.c_str(), configuredPort);
        if (cfgOk) client.stop();
    }

    Serial.printf("[NetProbe] Host=%s HTTPS=%s Port=%d Reachable=%s\n",
                  host.c_str(), isHttps ? "YES" : "NO", configuredPort,
                  cfgOk ? "YES" : "NO");
}

// ─────────────────────────────────────────────────────────────
//  Read flow rate from YF-S201 (L/min)
// ─────────────────────────────────────────────────────────────
float readFlowRate() {
    if (FLOW_PIN < 0) return 0.0f;  // flow sensor not connected
    unsigned long now     = millis();
    unsigned long elapsed = now - flowLastCalc;
    
    // Minimum 500ms between calculations to avoid division by very small numbers
    if (elapsed < 500) return flowRate_lpm;

    noInterrupts();
    uint32_t pulses = flowPulseCount;
    flowPulseCount  = 0;
    interrupts();

    // L/min = (pulses / elapsed_seconds) / calibration_factor
    flowRate_lpm = (pulses / (elapsed / 1000.0f)) / FLOW_CALIBRATION;
    flowLastCalc = now;
    Serial.printf("[Flow]  Pulses: %u  Elapsed: %lu ms  Rate: %.2f L/min\n", pulses, elapsed, flowRate_lpm);
    return flowRate_lpm;
}

// ─────────────────────────────────────────────────────────────
//  Read soil moisture from a single sensor and map to 0-100 %
// ─────────────────────────────────────────────────────────────
int readMoisturePercent(int pin) {
    int raw = analogRead(pin);
    // Debug: Print raw ADC value for calibration
    Serial.printf("[Moisture] Pin %d: Raw ADC = %d\n", pin, raw);
    
    // Clamp to calibrated range, then invert (high ADC = dry)
    raw = constrain(raw, MOISTURE_WET_ADC, MOISTURE_DRY_ADC);
    return map(raw, MOISTURE_DRY_ADC, MOISTURE_WET_ADC, 0, 100);
}

// ─────────────────────────────────────────────────────────────
//  POST /api/sensors (with 4 moisture sensors)
// ─────────────────────────────────────────────────────────────
void postSensorData() {
    float temperature = NAN;
    float humidity    = NAN;

    // Retry up to 3 times with 2s gap (DHT22 minimum sample rate is 2s)
    for (uint8_t attempt = 0; attempt < 3 && (isnan(temperature) || isnan(humidity)); attempt++) {
        if (attempt > 0) delay(2000);
        temperature = dht.readTemperature();
        humidity    = dht.readHumidity();
        Serial.printf("[DHT22] Attempt %u: T=%.1f H=%.1f\n", attempt + 1, temperature, humidity);
    }

    // Read all 4 moisture sensors
    int moisture_1 = readMoisturePercent(MOISTURE_PIN_1);
    int moisture_2 = readMoisturePercent(MOISTURE_PIN_2);
    int moisture_3 = readMoisturePercent(MOISTURE_PIN_3);
    int moisture_4 = readMoisturePercent(MOISTURE_PIN_4);

    // Calculate average
    int moisture_avg = (moisture_1 + moisture_2 + moisture_3 + moisture_4) / 4;

    bool dhtValid = !(isnan(temperature) || isnan(humidity));
    if (!dhtValid) {
        Serial.println("[Sensor] DHT read failed after 3 attempts — sending null for temperature & humidity.");
    }

    float flow = readFlowRate();
    Serial.printf("[Sensor] Temp: %.1f°C  Humidity: %.1f%%  Moisture Avg: %d%%  Flow: %.2f L/min\n",
                  temperature, humidity, moisture_avg, flow);
    Serial.printf("[Sensor] Zone A: %d%%  Zone B: %d%%  Zone C: %d%%  Zone D: %d%%\n",
                  moisture_1, moisture_2, moisture_3, moisture_4);

    // Build JSON payload
    JsonDocument doc;
    doc["field_id"]   = FIELD_ID;
    doc["moisture"]   = moisture_avg;
    doc["moisture_1"] = moisture_1;
    doc["moisture_2"] = moisture_2;
    doc["moisture_3"] = moisture_3;
    doc["moisture_4"] = moisture_4;
    doc["water_flow"] = serialized(String(flow, 2));
    if (dhtValid) {
        doc["temperature"] = serialized(String(temperature, 1));
        doc["humidity"]    = serialized(String(humidity, 1));
    } else {
        // Explicit null so the server can raise a DHT22 failure alert
        doc["temperature"] = nullptr;
        doc["humidity"]    = nullptr;
    }

    String payload;
    serializeJson(doc, payload);

    // HTTP POST with timeout for slow connections
    HTTPClient http;
    String url = String(SERVER_BASE_URL) + "/api/sensors";
    if (url.startsWith("https://")) {
        if (!secureReady) { secureClient.setInsecure(); secureReady = true; }
        http.begin(secureClient, url);
    } else {
        http.begin(url);
    }
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(15000);  // 15 second timeout for slow connections

    Serial.println("[HTTP]  Sending sensor data...");
    int code = http.POST(payload);
    if (code == 201) {
        Serial.println("[HTTP]  POST /api/sensors → 201 Created ✓");
    } else {
        if (code < 0) {
            Serial.printf("[HTTP]  POST /api/sensors → %d (%s)\n",
                          code,
                          HTTPClient::errorToString(code).c_str());
            Serial.printf("[HTTP]  URL: %s  WiFi: %d  IP: %s  RSSI: %d dBm\n",
                          url.c_str(),
                          (int)WiFi.status(),
                          WiFi.localIP().toString().c_str(),
                          WiFi.RSSI());
            
            // Retry once on timeout
            if (code == HTTPC_ERROR_READ_TIMEOUT || code == HTTPC_ERROR_CONNECTION_LOST) {
                Serial.println("[HTTP]  Retrying due to slow connection...");
                delay(2000);
                code = http.POST(payload);
                if (code == 201) {
                    Serial.println("[HTTP]  Retry successful ✓");
                } else {
                    Serial.printf("[HTTP]  Retry failed → %d\n", code);
                }
            }
        } else {
            Serial.printf("[HTTP]  POST /api/sensors → %d  %s\n",
                          code, http.getString().c_str());
        }
    }
    http.end();
}

// ─────────────────────────────────────────────────────────────
//  GET /api/pump/status  →  drive relay
// ─────────────────────────────────────────────────────────────
void pollPumpStatus() {
    HTTPClient http;
    String url = String(SERVER_BASE_URL) + "/api/pump/status";
    if (url.startsWith("https://")) {
        if (!secureReady) { secureClient.setInsecure(); secureReady = true; }
        http.begin(secureClient, url);
    } else {
        http.begin(url);
    }
    http.setTimeout(10000);  // 10 second timeout for slow connections

    int code = http.GET();
    if (code == 200) {
        String response = http.getString();
        
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, response);
        if (!err) {
            bool pumpOn = doc["data"]["on"].as<bool>();
            
            // Only log if state changed (reduce spam)
            if (pumpOn != lastPumpState) {
                Serial.printf("[Pump]  State changed: %s → %s\n", 
                              lastPumpState ? "ON" : "OFF",
                              pumpOn ? "ON" : "OFF");
                lastPumpState = pumpOn;
            }
            
            setPump(pumpOn);
        } else {
            Serial.printf("[Pump]  JSON parse error: %s\n", err.c_str());
        }
    } else {
        if (code < 0) {
            Serial.printf("[Pump]  Status check → %d (%s)  RSSI: %d dBm\n",
                          code,
                          HTTPClient::errorToString(code).c_str(),
                          WiFi.RSSI());
        } else {
            Serial.printf("[Pump]  Status check → %d\n", code);
        }
    }
    http.end();
}

// ─────────────────────────────────────────────────────────────
//  Relay helper
// ─────────────────────────────────────────────────────────────
void setPump(bool on) {
    // Reset flow calculation when pump state changes for instant response
    if (on != lastPumpState) {
        noInterrupts();
        flowPulseCount = 0;
        interrupts();
        flowLastCalc = millis();
        flowRate_lpm = 0.0f;
    }
    
#if RELAY_ACTIVE_LOW
    digitalWrite(PUMP_RELAY_PIN, on ? LOW : HIGH);
    Serial.printf("[Relay] GPIO%d → %s (pump %s)\n", 
                  PUMP_RELAY_PIN, 
                  on ? "LOW" : "HIGH",
                  on ? "ON" : "OFF");
#else
    digitalWrite(PUMP_RELAY_PIN, on ? HIGH : LOW);
    Serial.printf("[Relay] GPIO%d → %s (pump %s)\n", 
                  PUMP_RELAY_PIN, 
                  on ? "HIGH" : "LOW",
                  on ? "ON" : "OFF");
#endif
}

void setPumpForce(bool on) {
    setPump(on);
}
