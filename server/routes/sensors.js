/* ============================================================
   TerraSync — Sensor Routes
   POST /api/sensors         ← ESP32 sends readings here
   GET  /api/sensors/latest  ← Dashboard fetches latest values
   GET  /api/sensors/history ← Dashboard fetches chart data
   ============================================================ */
const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// ────────────────────────────────────────────
// POST /api/sensors — Receive data from ESP32
// Body: { field_id, moisture, temperature, humidity, water_flow }
// ────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { field_id = 1, moisture, temperature, humidity, water_flow } = req.body;

    await pool.execute(
      `INSERT INTO sensor_readings (field_id, moisture, temperature, humidity, water_flow)
       VALUES (?, ?, ?, ?, ?)`,
      [field_id, moisture, temperature, humidity, water_flow]
    );

    // Check thresholds and create alerts (max one per type per field per hour)
    if (temperature > 35) {
      const [dup] = await pool.execute(
        `SELECT id FROM alerts WHERE field_id = ? AND title = 'High Temperature Alert' AND created_at > NOW() - INTERVAL 1 HOUR LIMIT 1`,
        [field_id]
      );
      if (!dup.length) {
        await pool.execute(
          `INSERT INTO alerts (field_id, type, title, message)
           VALUES (?, 'warning', 'High Temperature Alert', ?)`,
          [field_id, `Temperature reached ${temperature}°C — exceeds optimal range.`]
        );
      }
    }
    if (moisture < 30) {
      const [dup] = await pool.execute(
        `SELECT id FROM alerts WHERE field_id = ? AND title = 'Low Soil Moisture' AND created_at > NOW() - INTERVAL 1 HOUR LIMIT 1`,
        [field_id]
      );
      if (!dup.length) {
        await pool.execute(
          `INSERT INTO alerts (field_id, type, title, message)
           VALUES (?, 'warning', 'Low Soil Moisture', ?)`,
          [field_id, `Soil moisture dropped to ${moisture}% — consider irrigation.`]
        );
      }
    }

    res.status(201).json({ success: true, message: 'Reading saved' });
  } catch (err) {
    console.error('POST /api/sensors error:', err.message);
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
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
    const connected  = secondsAgo <= 90;
    res.json({ success: true, connected, lastSeen: rows[0].recorded_at, secondsAgo });
  } catch (err) {
    console.error('GET /api/sensors/esp32-status error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
