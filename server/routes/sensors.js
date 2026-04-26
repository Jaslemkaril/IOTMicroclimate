/* ============================================================
   TerraSync — Sensor Routes
   POST /api/sensors         ← ESP32 sends readings here
   GET  /api/sensors/latest  ← Dashboard fetches latest values
   GET  /api/sensors/history ← Dashboard fetches chart data
   ============================================================ */
const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// ── Simple in-process rate limiter for the ingest endpoint ──
// Allows at most 1 POST per 2 s per IP address.  The map is
// pruned every 60 s to prevent unbounded memory growth.
const _lastSeen = new Map();
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [ip, ts] of _lastSeen) if (ts < cutoff) _lastSeen.delete(ip);
}, 60_000);

function sensorRateLimit(req, res, next) {
  const ip  = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  if (now - (_lastSeen.get(ip) || 0) < 2000) {
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }
  _lastSeen.set(ip, now);
  next();
}

// ────────────────────────────────────────────
// POST /api/sensors — Receive data from ESP32
// Body: { field_id, moisture, moisture_1, moisture_2, moisture_3, moisture_4, temperature, humidity, water_flow }
// ────────────────────────────────────────────
router.post('/', sensorRateLimit, async (req, res) => {
  try {
    const { 
      field_id = 1, 
      moisture,      // Average (for backward compatibility)
      moisture_1,    // Zone A (NW)
      moisture_2,    // Zone B (NE)
      moisture_3,    // Zone C (SW)
      moisture_4,    // Zone D (SE)
      temperature, 
      humidity, 
      water_flow 
    } = req.body;

    // ── Parse individual moisture sensors ──
    const m1 = moisture_1 != null ? parseFloat(moisture_1) : null;
    const m2 = moisture_2 != null ? parseFloat(moisture_2) : null;
    const m3 = moisture_3 != null ? parseFloat(moisture_3) : null;
    const m4 = moisture_4 != null ? parseFloat(moisture_4) : null;

    // ── Calculate average moisture (if individual sensors provided) ──
    let moisture_avg;
    if (m1 !== null || m2 !== null || m3 !== null || m4 !== null) {
      const validSensors = [m1, m2, m3, m4].filter(v => v !== null);
      moisture_avg = validSensors.length > 0 
        ? validSensors.reduce((sum, v) => sum + v, 0) / validSensors.length
        : null;
    } else {
      // Fallback to single moisture value (backward compatibility)
      moisture_avg = moisture != null ? parseFloat(moisture) : null;
    }

    // ── Validate average moisture (required) ──
    if (moisture_avg === null || isNaN(moisture_avg) || moisture_avg < 0 || moisture_avg > 100) {
      return res.status(400).json({ success: false, error: 'moisture must be 0–100 %' });
    }

    // ── Validate individual sensors (if provided) ──
    for (const [val, name] of [[m1, 'moisture_1'], [m2, 'moisture_2'], [m3, 'moisture_3'], [m4, 'moisture_4']]) {
      if (val !== null && (isNaN(val) || val < 0 || val > 100)) {
        return res.status(400).json({ success: false, error: `${name} must be 0–100 %` });
      }
    }

    // ── Validate optional fields (null = DHT22 failed / sensor absent) ──
    const temperature_f = temperature != null ? parseFloat(temperature) : null;
    const humidity_f    = humidity    != null ? parseFloat(humidity)    : null;
    const water_flow_f  = water_flow  != null ? parseFloat(water_flow)  : null;

    if (temperature_f !== null && (isNaN(temperature_f) || temperature_f < -10 || temperature_f > 85)) {
      return res.status(400).json({ success: false, error: 'temperature must be -10–85 °C' });
    }
    if (humidity_f !== null && (isNaN(humidity_f) || humidity_f < 0 || humidity_f > 100)) {
      return res.status(400).json({ success: false, error: 'humidity must be 0–100 %' });
    }
    if (water_flow_f !== null && (isNaN(water_flow_f) || water_flow_f < 0 || water_flow_f > 30)) {
      return res.status(400).json({ success: false, error: 'water_flow must be 0–30 L/min' });
    }

    await pool.execute(
      `INSERT INTO sensor_readings (field_id, moisture, moisture_1, moisture_2, moisture_3, moisture_4, temperature, humidity, water_flow)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [field_id, moisture_avg, m1, m2, m3, m4, temperature_f, humidity_f, water_flow_f]
    );

    // ── Threshold alerts (max one per type per field per hour) ──
    if (temperature_f !== null && temperature_f > 35) {
      const [dup] = await pool.execute(
        `SELECT id FROM alerts WHERE field_id = ? AND title = 'High Temperature Alert' AND created_at > NOW() - INTERVAL 1 HOUR LIMIT 1`,
        [field_id]
      );
      if (!dup.length) {
        await pool.execute(
          `INSERT INTO alerts (field_id, type, title, message)
           VALUES (?, 'warning', 'High Temperature Alert', ?)`,
          [field_id, `Temperature reached ${temperature_f}°C — exceeds optimal range.`]
        );
      }
    }

    // ── Check each zone for low moisture ──
    const zones = [
      { val: m1, name: 'Zone A (NW)' },
      { val: m2, name: 'Zone B (NE)' },
      { val: m3, name: 'Zone C (SW)' },
      { val: m4, name: 'Zone D (SE)' }
    ];
    for (const zone of zones) {
      if (zone.val !== null && zone.val < 30) {
        const [dup] = await pool.execute(
          `SELECT id FROM alerts WHERE field_id = ? AND title = ? AND created_at > NOW() - INTERVAL 1 HOUR LIMIT 1`,
          [field_id, `Low Soil Moisture - ${zone.name}`]
        );
        if (!dup.length) {
          await pool.execute(
            `INSERT INTO alerts (field_id, type, title, message)
             VALUES (?, 'warning', ?, ?)`,
            [field_id, `Low Soil Moisture - ${zone.name}`, `${zone.name} moisture dropped to ${zone.val}% — consider irrigation.`]
          );
        }
      }
    }

    // ── DHT22 failure alert (temperature AND humidity both null) ──
    if (temperature_f === null && humidity_f === null) {
      const [dup] = await pool.execute(
        `SELECT id FROM alerts WHERE field_id = ? AND title = 'DHT22 Sensor Failure' AND created_at > NOW() - INTERVAL 1 HOUR LIMIT 1`,
        [field_id]
      );
      if (!dup.length) {
        await pool.execute(
          `INSERT INTO alerts (field_id, type, title, message)
           VALUES (?, 'warning', 'DHT22 Sensor Failure', ?)`,
          [field_id, 'Temperature and humidity sensor failed to respond. Check DHT22 wiring and power supply.']
        );
      }
    }

    res.status(201).json({ success: true, message: 'Reading saved' });
  } catch (err) {
    console.error('POST /api/sensors error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────
// GET /api/sensors/latest — Most recent reading per field
// ────────────────────────────────────────────
router.get('/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT sr.*,
             TIMESTAMPDIFF(SECOND, sr.recorded_at, NOW()) AS seconds_ago,
             f.name AS field_name, f.crop, f.status AS field_status
      FROM sensor_readings sr
      INNER JOIN (
        SELECT field_id, MAX(id) AS max_id
        FROM sensor_readings
        GROUP BY field_id
      ) latest ON sr.id = latest.max_id
      LEFT JOIN fields f ON sr.field_id = f.id
      ORDER BY sr.field_id
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/sensors/latest error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────
// GET /api/sensors/history?field_id=1&range=live|1h|24h|7d|30d
// Returns time-series data for charts
// ────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const fieldId = parseInt(req.query.field_id, 10) || 1;
    const range   = req.query.range || 'live';

    // live  → last 60 raw rows, no grouping (for the 5-second chart)
    // 1h    → last 60 minutes, grouped per minute (for CSV "this hour")
    // 24h   → last 24 hours,   grouped per hour
    // 7d    → last 7 days,     grouped per hour
    // 30d   → last 30 days,    grouped per day
    if (range === 'live') {
      const [rows] = await pool.query(`
        SELECT
          DATE_FORMAT(recorded_at, '%H:%i:%s') AS label,
          ROUND(moisture,    1) AS moisture,
          ROUND(moisture_1,  1) AS moisture_1,
          ROUND(moisture_2,  1) AS moisture_2,
          ROUND(moisture_3,  1) AS moisture_3,
          ROUND(moisture_4,  1) AS moisture_4,
          ROUND(temperature, 1) AS temperature,
          ROUND(humidity,    1) AS humidity,
          ROUND(water_flow,  1) AS water_flow
        FROM sensor_readings
        WHERE field_id = ?
        ORDER BY recorded_at DESC
        LIMIT 60
      `, [fieldId]);
      return res.json({ success: true, data: rows.reverse() });
    }

    let interval, groupBy, dateFormat;
    switch (range) {
      case '1h':
        interval   = 'INTERVAL 1 HOUR';
        groupBy    = "DATE_FORMAT(recorded_at, '%Y-%m-%d %H:%i')";
        dateFormat = '%H:%i';
        break;
      case '7d':
        interval   = 'INTERVAL 7 DAY';
        groupBy    = "DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00')";
        dateFormat = '%b %d %Hh';
        break;
      case '30d':
        interval   = 'INTERVAL 30 DAY';
        groupBy    = 'DATE(recorded_at)';
        dateFormat = '%b %d';
        break;
      default: // 24h
        interval   = 'INTERVAL 24 HOUR';
        groupBy    = "DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00')";
        dateFormat = '%H:00';
    }

    const [rows] = await pool.query(`
      SELECT
        DATE_FORMAT(recorded_at, '${dateFormat}') AS label,
        ROUND(AVG(moisture),    1) AS moisture,
        ROUND(AVG(moisture_1),  1) AS moisture_1,
        ROUND(AVG(moisture_2),  1) AS moisture_2,
        ROUND(AVG(moisture_3),  1) AS moisture_3,
        ROUND(AVG(moisture_4),  1) AS moisture_4,
        ROUND(AVG(temperature), 1) AS temperature,
        ROUND(AVG(humidity),    1) AS humidity,
        ROUND(AVG(water_flow),  1) AS water_flow
      FROM sensor_readings
      WHERE field_id = ? AND recorded_at >= DATE_SUB(NOW(), ${interval})
      GROUP BY ${groupBy}
      ORDER BY MIN(recorded_at)
    `, [fieldId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/sensors/history error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────
// GET /api/sensors/esp32-status
// Returns whether the ESP32 has posted a reading within the last 60 seconds
// ────────────────────────────────────────────
router.get('/esp32-status', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        recorded_at,
        TIMESTAMPDIFF(SECOND, recorded_at, NOW()) AS seconds_ago
      FROM sensor_readings
      ORDER BY recorded_at DESC
      LIMIT 1
    `);
    if (rows.length === 0) {
      return res.json({ success: true, connected: false, lastSeen: null, secondsAgo: null });
    }
    const secondsAgo = rows[0].seconds_ago;
    const connected  = secondsAgo <= 30;  // must have posted within last 30s
    res.json({ success: true, connected, lastSeen: rows[0].recorded_at, secondsAgo });
  } catch (err) {
    console.error('GET /api/sensors/esp32-status error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
