# 🚨 TerraSync Irrigation Notification System

## Soil Moisture Thresholds

### **When Does the System Notify?**

| Moisture Level | Status | Action Required | Visual Indicator |
|---------------|--------|-----------------|------------------|
| **60% - 100%** | Overwatered | Reduce watering | 🟠 Orange warning |
| **40% - 60%** | ✅ Optimal | No action needed | 🟢 Green (Healthy) |
| **30% - 40%** | ⚠️ Low | Consider irrigation | 🟡 Yellow warning |
| **20% - 30%** | 🚨 Dry | Irrigate soon | 🔴 Red (Low Moisture) |
| **< 20%** | 🚨 Critical | Irrigate immediately | 🔴 Red (Dry) |

---

## Dashboard Notifications

### **1. Zone Summary (Real-time)**
Located in the Soil Moisture card:

- **All zones optimal (≥40%):**
  ```
  ✓ All zones optimal — no irrigation needed
  ```

- **Some zones low (<40%):**
  ```
  ⚠️ 2 zones need attention — irrigate Zones A, C
  ```

- **All zones low (<40%):**
  ```
  ⚠️ All zones need water — start irrigation immediately
  ```

### **2. Field Status Table**
Each field shows status badge:

- **Healthy** (40-60% moisture): Green badge
- **Low Moisture** (30-40%): Yellow badge  
- **Dry** (<20%): Red badge
- **High Temp** (>35°C): Red "High Temp" badge

### **3. Health Score**
Doughnut chart shows overall farm health:

**Moisture Impact:**
- 40-60%: +20 points (optimal)
- 30-40%: +10 points (acceptable)
- 60-75%: +10 points (slightly high)
- <20% or >85%: -20 points (critical)

**Temperature Impact:**
- 20-30°C: +20 points (optimal)
- >35°C: -25 points (too hot)
- <15°C: -15 points (too cold)

**Humidity Impact:**
- 50-70%: +10 points (optimal)
- <30% or >90%: -10 points (poor)

---

## Alert System

### **Automatic Alerts**
The system generates alerts for:

1. **Low Moisture Alert**
   - Triggers when: moisture < 30%
   - Cooldown: 1 hour between alerts
   - Message: "⚠️ Low Soil Moisture — Field X is at Y% moisture. Consider irrigation."

2. **High Temperature Alert**
   - Triggers when: temperature > 35°C
   - Cooldown: 1 hour
   - Message: "🌡️ High Temperature — Field X is at Y°C. Monitor crops closely."

3. **Tank Low Alert**
   - Triggers when: tank < 1.5 L (21%)
   - Cooldown: 1 hour
   - Message: "⚠️ Water Tank Low — Tank is at X% (Y L remaining). Refill soon."

4. **Tank Empty Alert**
   - Triggers when: tank ≤ 0.628 L (dead zone)
   - Cooldown: 30 minutes
   - Message: "🚨 Tank Empty! — Pump cannot draw water. Refill immediately."

---

## Customization

You can adjust thresholds in the Settings panel:

**Moisture Thresholds:**
- Optimal Min: 40% (default)
- Optimal Max: 60% (default)
- Critical: 25% (default)

**Temperature Thresholds:**
- Optimal Min: 20°C (default)
- Optimal Max: 30°C (default)
- Critical High: 35°C (default)

**Humidity Thresholds:**
- Optimal Min: 50% (default)
- Optimal Max: 70% (default)

---

## Recommended Actions

### **Moisture < 40%**
1. Check dashboard zone summary
2. Identify which zones need water
3. Turn on pump manually or schedule irrigation
4. Monitor until moisture reaches 40-60%

### **Moisture < 25%**
1. **Immediate action required**
2. Start irrigation immediately
3. Check if tank has enough water
4. Monitor closely for next 30 minutes

### **Moisture > 75%**
1. Stop irrigation
2. Check for drainage issues
3. Reduce watering frequency
4. Monitor for root rot signs

---

## Summary

**Key Takeaway:** The system notifies you when soil moisture drops **below 40%**, with critical alerts at **25%**. Optimal range is **40-60%** for healthy crop growth.
