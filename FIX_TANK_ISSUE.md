# 🔧 Fix Tank Level Issue

## Problem
Tank shows **169.977 L** instead of **7.0 L** because:
1. Flow sensor was enabled in firmware (GPIO21)
2. No actual sensor connected → reads garbage/noise
3. System calculated water consumption from fake flow data
4. Tank level became incorrect

## ✅ Quick Fix (Do This Now)

### **Step 1: Click "Refill" Button**
1. Go to dashboard: https://iotmicroclimate-production.up.railway.app
2. Scroll to **Water Tank** card
3. Click the **"Refill"** button (top right)
4. Tank will reset to **7.000 L** (100%)

### **Step 2: Verify**
- Water Remaining: **7.000 L** ✅
- Percentage: **100%** ✅
- Used Today: **0.000 L** ✅

---

## 🛠️ Permanent Fix (Already Done)

I've already disabled the flow sensor in your firmware:

```cpp
// firmware/include/config.h
#define FLOW_PIN  -1  // Disabled (no sensor connected)
```

**Next time you flash ESP32**, it will:
- ✅ Not read from GPIO21
- ✅ Not send fake flow data
- ✅ Tank calculations will be accurate

---

## 📊 Why This Happened

### **Before (Wrong):**
```
Flow Sensor: Enabled (GPIO21)
Actual Hardware: None connected
ESP32 reads: Random noise (e.g., 25.7 L/min)
System calculates: 25.7 L/min × 10 min = 257 L consumed
Tank level: 7.0 - 257 = -250 L → Shows as 0 L
```

### **After (Correct):**
```
Flow Sensor: Disabled (FLOW_PIN = -1)
ESP32 sends: 0.00 L/min (no sensor)
System calculates: 0 L/min × time = 0 L consumed
Tank level: Stays at 7.0 L ✅
```

---

## 🔮 Future: When You Add Flow Sensor

When you get the YF-S201 flow sensor:

1. **Connect hardware:**
   - VCC → 5V
   - GND → GND
   - Signal → GPIO21

2. **Update firmware:**
   ```cpp
   #define FLOW_PIN  21  // Enable sensor
   ```

3. **Flash ESP32**

4. **Calibrate:**
   - Measure 1 liter of water
   - Count pulses
   - Adjust `FLOW_CALIBRATION` if needed

---

## 📝 Summary

**Right now:**
1. Click "Refill" button on dashboard → Tank resets to 7.0 L
2. Flow sensor is disabled → No more garbage data
3. Tank level will stay accurate

**Later:**
- When you add real flow sensor, re-enable it in config.h
- System will track actual water usage accurately
