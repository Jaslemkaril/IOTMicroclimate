/* ============================================================
   Simple Relay Test - Tests both HIGH and LOW signals
   This will help identify if your relay is ACTIVE_LOW or ACTIVE_HIGH
   and if you're using NO or NC contacts
   ============================================================ */

#define RELAY_PIN 25

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========================================");
  Serial.println("  RELAY DIAGNOSTIC TEST");
  Serial.println("========================================");
  Serial.println();
  Serial.println("This test will help identify:");
  Serial.println("1. Is your relay ACTIVE_LOW or ACTIVE_HIGH?");
  Serial.println("2. Are you using NO or NC contacts?");
  Serial.println();
  
  pinMode(RELAY_PIN, OUTPUT);
  
  Serial.println("Test 1: Setting GPIO25 to HIGH");
  Serial.println("----------------------------------------");
  digitalWrite(RELAY_PIN, HIGH);
  Serial.println("GPIO25 = HIGH");
  Serial.println();
  Serial.println("CHECK YOUR PUMP NOW:");
  Serial.println("  - Is the pump ON or OFF?");
  Serial.println("  - Is the relay LED lit?");
  Serial.println("  - Did you hear a click?");
  Serial.println();
  Serial.println("Waiting 10 seconds...");
  delay(10000);
  
  Serial.println();
  Serial.println("Test 2: Setting GPIO25 to LOW");
  Serial.println("----------------------------------------");
  digitalWrite(RELAY_PIN, LOW);
  Serial.println("GPIO25 = LOW");
  Serial.println();
  Serial.println("CHECK YOUR PUMP NOW:");
  Serial.println("  - Is the pump ON or OFF?");
  Serial.println("  - Is the relay LED lit?");
  Serial.println("  - Did you hear a click?");
  Serial.println();
  Serial.println("Waiting 10 seconds...");
  delay(10000);
  
  Serial.println();
  Serial.println("========================================");
  Serial.println("  TEST RESULTS");
  Serial.println("========================================");
  Serial.println();
  Serial.println("Please tell me:");
  Serial.println("1. When GPIO25 = HIGH:");
  Serial.println("   - Pump was: ON or OFF?");
  Serial.println("   - Relay LED was: ON or OFF?");
  Serial.println();
  Serial.println("2. When GPIO25 = LOW:");
  Serial.println("   - Pump was: ON or OFF?");
  Serial.println("   - Relay LED was: ON or OFF?");
  Serial.println();
  Serial.println("Test will repeat in 5 seconds...");
  Serial.println("========================================");
  delay(5000);
}

void loop() {
  // Repeat the test
  setup();
}
