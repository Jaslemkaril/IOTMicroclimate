/* ============================================================
   TerraSync — ESP32 Firmware
   Reads DHT22 (temperature + humidity) and a capacitive/
   resistive soil-moisture sensor, then POSTs the values to
   the TerraSync Node.js API every SENSOR_INTERVAL ms.
   Also polls /api/pump/status and drives a relay accordingly.
   ============================================================ */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#include "config.h"

// ── Globals ──────────────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSensorPost = 0;
unsigned long lastPumpPoll   = 0;

// ── Forward declarations ─────────────────────────────────────
void connectWiFi();
void postSensorData();
void pollPumpStatus();
int  readMoisturePercent();
void setPump(bool on);

// ─────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    Serial.println("\n=== TerraSync ESP32 Firmware ===");

    // Relay pin — set safe state before anything else
    pinMode(PUMP_RELAY_PIN, OUTPUT);
    setPump(false);

    dht.begin();
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
}

// ─────────────────────────────────────────────────────────────
//  WiFi
// ─────────────────────────────────────────────────────────────
void connectWiFi() {
    Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    uint8_t tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 30) {
        delay(500);
        Serial.print('.');
        tries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Connected — IP: %s\n",
                      WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WiFi] Failed to connect. Will retry in next loop.");
    }
}

// ─────────────────────────────────────────────────────────────
//  Read soil moisture and map to 0-100 %
// ─────────────────────────────────────────────────────────────
int readMoisturePercent() {
    int raw = analogRead(MOISTURE_PIN);
    // Clamp to calibrated range, then invert (high ADC = dry)
    raw = constrain(raw, MOISTURE_WET_ADC, MOISTURE_DRY_ADC);
    return map(raw, MOISTURE_DRY_ADC, MOISTURE_WET_ADC, 0, 100);
}

// ─────────────────────────────────────────────────────────────
//  POST /api/sensors
// ─────────────────────────────────────────────────────────────
void postSensorData() {
    float temperature = dht.readTemperature();   // Celsius
    float humidity    = dht.readHumidity();
    int   moisture    = readMoisturePercent();

    bool dhtValid = !(isnan(temperature) || isnan(humidity));
    if (!dhtValid) {
        temperature = 25.0f;
        humidity = 60.0f;
        Serial.println("[Sensor] DHT read failed — posting fallback values (Temp 25.0°C, Humidity 60.0%).");
    }

    Serial.printf("[Sensor] Temp: %.1f°C  Humidity: %.1f%%  Moisture: %d%%\n",
                  temperature, humidity, moisture);

    // Build JSON payload
    JsonDocument doc;
    doc["field_id"]    = FIELD_ID;
    doc["temperature"] = serialized(String(temperature, 1));
    doc["humidity"]    = serialized(String(humidity, 1));
    doc["moisture"]    = moisture;
    doc["water_flow"]  = 0;          // Update if you have a flow sensor

    String payload;
    serializeJson(doc, payload);

    // HTTP POST
    HTTPClient http;
    String url = String(SERVER_BASE_URL) + "/api/sensors";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    int code = http.POST(payload);
    if (code == 201) {
        Serial.println("[HTTP]  POST /api/sensors → 201 Created");
    } else {
        Serial.printf("[HTTP]  POST /api/sensors → %d  %s\n",
                      code, http.getString().c_str());
    }
    http.end();
}

// ─────────────────────────────────────────────────────────────
//  GET /api/pump/status  →  drive relay
// ─────────────────────────────────────────────────────────────
void pollPumpStatus() {
    HTTPClient http;
    String url = String(SERVER_BASE_URL) + "/api/pump/status";
    http.begin(url);

    int code = http.GET();
    if (code == 200) {
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, http.getString());
        if (!err) {
            bool pumpOn = doc["data"]["on"].as<bool>();
            setPump(pumpOn);
            Serial.printf("[Pump]  Status from server: %s\n",
                          pumpOn ? "ON" : "OFF");
        } else {
            Serial.printf("[Pump]  JSON parse error: %s\n", err.c_str());
        }
    } else {
        Serial.printf("[HTTP]  GET /api/pump/status → %d\n", code);
    }
    http.end();
}

// ─────────────────────────────────────────────────────────────
//  Relay helper
// ─────────────────────────────────────────────────────────────
void setPump(bool on) {
#if RELAY_ACTIVE_LOW
    digitalWrite(PUMP_RELAY_PIN, on ? LOW : HIGH);
#else
    digitalWrite(PUMP_RELAY_PIN, on ? HIGH : LOW);
#endif
}
