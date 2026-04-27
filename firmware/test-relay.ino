/* ============================================================
   Simple Relay Test - Blinks relay ON/OFF every 2 seconds
   Use this to test if your relay module is working correctly
   ============================================================ */

#define RELAY_PIN 25
#define RELAY_ACTIVE_LOW true  // true = LOW turns relay ON

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Relay Test ===");
  Serial.println("Relay will blink ON/OFF every 2 seconds");
  Serial.println("Watch the relay LED and listen for clicking sound");
  
  pinMode(RELAY_PIN, OUTPUT);
  
  // Start with relay OFF
  #if RELAY_ACTIVE_LOW
    digitalWrite(RELAY_PIN, HIGH);  // HIGH = OFF
    Serial.println("Initial state: HIGH (OFF)");
  #else
    digitalWrite(RELAY_PIN, LOW);   // LOW = OFF
    Serial.println("Initial state: LOW (OFF)");
  #endif
  
  delay(2000);
}

void loop() {
  // Turn relay ON
  #if RELAY_ACTIVE_LOW
    digitalWrite(RELAY_PIN, LOW);   // LOW = ON
    Serial.println("[ON]  GPIO25 → LOW  (relay should click and LED should light up)");
  #else
    digitalWrite(RELAY_PIN, HIGH);  // HIGH = ON
    Serial.println("[ON]  GPIO25 → HIGH (relay should click and LED should light up)");
  #endif
  
  delay(2000);
  
  // Turn relay OFF
  #if RELAY_ACTIVE_LOW
    digitalWrite(RELAY_PIN, HIGH);  // HIGH = OFF
    Serial.println("[OFF] GPIO25 → HIGH (relay should click and LED should turn off)");
  #else
    digitalWrite(RELAY_PIN, LOW);   // LOW = OFF
    Serial.println("[OFF] GPIO25 → LOW  (relay should click and LED should turn off)");
  #endif
  
  delay(2000);
}
