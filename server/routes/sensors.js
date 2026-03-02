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

    // Check thresholds and create alerts automatically
    if (temperature > 35) {
      await pool.execute(
        `INSERT INTO alerts (field_id, type, title, message)
         VALUES (?, 'warning', 'High Temperature Alert', ?)`,
        [field_id, `Temperature reached ${temperature}°C — exceeds optimal range.`]
      );
    }
    if (moisture < 30) {
      await pool.execute(
        `INSERT INTO alerts (field_id, type, title, message)
         VALUES (?, 'warning', 'Low Soil Moisture', ?)`,
        [field_id, `Soil moisture dropped to ${moisture}% — consider irrigation.`]
      );
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
      SELECT sr.*, f.name AS field_name, f.crop, f.status AS field_status
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
// GET /api/sensors/history?field_id=1&range=24h
// Returns time-series data for charts
// range: 24h | 7d | 30d
// ────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const fieldId = parseInt(req.query.field_id, 10) || 1;
    const range   = req.query.range || '24h';

    let interval, groupBy, dateFormat;
    switch (range) {
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
        ROUND(AVG(moisture),  1) AS moisture,
        ROUND(AVG(temperature), 1) AS temperature,
        ROUND(AVG(humidity),  1) AS humidity,
        ROUND(AVG(water_flow),1) AS water_flow
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

module.exports = router;
