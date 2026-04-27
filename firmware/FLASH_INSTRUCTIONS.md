# How to Flash Updated Firmware to ESP32

## The Problem
The pump was taking 5-8 seconds to turn OFF because the ESP32 only checked the server every 8 seconds.

## The Fix
Changed pump polling from 8 seconds to 2 seconds for instant response.

## Steps to Flash

### 1. Close Serial Monitor
- Close PlatformIO Serial Monitor
- Close Arduino IDE Serial Monitor
- Close any program using COM3

### 2. Flash the Firmware

**Option A: Using PlatformIO (Recommended)**
```bash
cd firmware
pio run --target upload --upload-port COM3
```

**Option B: Using the Batch File**
```bash
cd firmware
.\flash-and-monitor.bat
```

### 3. Test the Pump
1. Open the dashboard: https://iotmicroclimate-production.up.railway.app
2. Toggle the pump ON - should turn on immediately
3. Toggle the pump OFF - should turn off within 2 seconds (instead of 5-8 seconds)

## What Changed
- `PUMP_POLL_INTERVAL`: 8000ms → 2000ms (4x faster)
- Added state change detection to reduce log spam
- Added relay GPIO logging for debugging

## Troubleshooting

**"Could not open COM3, the port is busy"**
- Close all Serial Monitors
- Unplug and replug the ESP32
- Try a different USB port

**Pump still doesn't turn off**
- Check relay wiring: GPIO25 → Relay IN
- Check relay power: 5V and GND connected
- Check relay contacts: Using NO (Normally Open), not NC
- Run the relay test: `firmware/test-relay.ino`

**ESP32 keeps restarting**
- Power supply issue - use a good USB cable
- Check if relay is drawing too much current
- Use external 5V power for the relay module
