/* ============================================================
   TerraSync — Field Routes
   GET  /api/fields        ← All fields with latest readings
   POST /api/fields        ← Create a new field
   ============================================================ */
const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// ────────────────────────────────────────────
// GET /api/fields — All fields with latest sensor snapshot
// Status is computed from live sensor data, not stored statically.
// ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.*,
             sr.moisture, sr.temperature, sr.humidity, sr.water_flow,
             sr.recorded_at AS last_reading_at,
             TIMESTAMPDIFF(SECOND, sr.recorded_at, NOW()) AS seconds_ago
      FROM fields f
      LEFT JOIN sensor_readings sr ON sr.id = (
        SELECT MAX(id) FROM sensor_readings WHERE field_id = f.id
      )
      ORDER BY f.id
    `);

    // Compute status dynamically from latest sensor values
    const data = rows.map(f => {
      const temp  = f.temperature !== null ? parseFloat(f.temperature) : null;
      const moist = f.moisture    !== null ? parseFloat(f.moisture)    : null;
      let status = 'healthy';
      if (temp !== null || moist !== null) {
        if ((temp !== null && temp > 35) || (moist !== null && moist < 20))
          status = 'critical';
        else if ((temp !== null && temp > 30) || (moist !== null && (moist < 30 || moist > 75)))
          status = 'warning';
      } else {
        // No sensor data yet — keep as healthy (no fake warning)
        status = 'healthy';
      }
      return { ...f, status };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/fields error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────
// POST /api/fields — Add a new field
// Body: { name, crop, crop_icon, status }
// ────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, crop, crop_icon = 'fa-leaf', status = 'healthy' } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });

    const [result] = await pool.execute(
      `INSERT INTO fields (name, crop, crop_icon, status) VALUES (?, ?, ?, ?)`,
      [name, crop, crop_icon, status]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('POST /api/fields error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────
// PUT /api/fields/:id — Update a field
// Body: { name, crop, crop_icon }
// ────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, crop, crop_icon } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });

    const [result] = await pool.execute(
      `UPDATE fields SET name = ?, crop = ?, crop_icon = ? WHERE id = ?`,
      [name, crop || null, crop_icon || 'fa-leaf', id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, error: 'Field not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/fields/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
