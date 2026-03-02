/* ============================================================
   TerraSync — Alert Routes
   GET  /api/alerts          ← Recent alerts
   PUT  /api/alerts/read-all ← Mark all alerts read
   PUT  /api/alerts/:id/read ← Mark one alert read
   ============================================================ */
const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// ────────────────────────────────────────────
// GET /api/alerts?limit=20
// ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const [rows] = await pool.query(`
      SELECT a.*, f.name AS field_name
      FROM alerts a
      LEFT JOIN fields f ON a.field_id = f.id
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [limit]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/alerts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ────────────────────────────────────────────
// PUT /api/alerts/read-all — Mark all alerts read
// NOTE: must be defined BEFORE /:id/read
// ────────────────────────────────────────────
router.put('/read-all', async (req, res) => {
  try {
    await pool.execute(`UPDATE alerts SET is_read = 1 WHERE is_read = 0`);
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/alerts/read-all error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ────────────────────────────────────────────
// PUT /api/alerts/:id/read — Mark one alert read
// ────────────────────────────────────────────
router.put('/:id/read', async (req, res) => {
  try {
    await pool.execute(`UPDATE alerts SET is_read = 1 WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/alerts/:id/read error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
