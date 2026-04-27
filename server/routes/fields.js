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
// Each field maps to a specific zone sensor (moisture_1, moisture_2, moisture_3, or moisture_4)
// ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.*,
             CASE 
               WHEN f.zone_sensor = 1 THEN sr.moisture_1
               WHEN f.zone_sensor = 2 THEN sr.moisture_2
               WHEN f.zone_sensor = 3 THEN sr.moisture_3
               WHEN f.zone_sensor = 4 THEN sr.moisture_4
               ELSE sr.moisture
             END AS moisture,
             sr.temperature, sr.humidity, sr.water_flow,
             sr.recorded_at AS last_reading_at,
             TIMESTAMPDIFF(SECOND, sr.recorded_at, NOW()) AS seconds_ago
      FROM fields f
      LEFT JOIN sensor_readings sr ON sr.id = (
        SELECT MAX(id) FROM sensor_readings WHERE field_id = 1
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
// Body: { name, crop, crop_icon }
// Auto-assigns next available zone (1-4), max 4 fields
// ────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, crop, crop_icon = 'fa-leaf' } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });

    // Check if we already have 4 fields
    const [existing] = await pool.query('SELECT COUNT(*) as count FROM fields');
    if (existing[0].count >= 4) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maximum 4 fields allowed (one per sensor zone)' 
      });
    }

    // Find next available zone (1-4)
    const [usedZones] = await pool.query('SELECT zone_sensor FROM fields WHERE zone_sensor IS NOT NULL');
    const used = usedZones.map(r => r.zone_sensor);
    let nextZone = null;
    for (let i = 1; i <= 4; i++) {
      if (!used.includes(i)) {
        nextZone = i;
        break;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO fields (name, crop, crop_icon, zone_sensor) VALUES (?, ?, ?, ?)`,
      [name, crop, crop_icon, nextZone]
    );
    
    const zoneNames = { 1: 'Zone A (NW)', 2: 'Zone B (NE)', 3: 'Zone C (SW)', 4: 'Zone D (SE)' };
    res.status(201).json({ 
      success: true, 
      id: result.insertId,
      zone_sensor: nextZone,
      zone_name: zoneNames[nextZone]
    });
  } catch (err) {
    console.error('POST /api/fields error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────
// PUT /api/fields/:id — Update a field
// Body: { name, crop, crop_icon, zone_sensor }
// ────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, crop, crop_icon, zone_sensor } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });

    const [result] = await pool.execute(
      `UPDATE fields SET name = ?, crop = ?, crop_icon = ?, zone_sensor = ? WHERE id = ?`,
      [name, crop || null, crop_icon || 'fa-leaf', zone_sensor || null, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, error: 'Field not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/fields/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────
// DELETE /api/fields/:id — Delete a field
// ────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      `DELETE FROM fields WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, error: 'Field not found' });

    res.json({ success: true, message: 'Field deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/fields/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
