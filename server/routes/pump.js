/* ============================================================
   TerraSync — Pump / Irrigation Routes
   POST /api/pump/toggle     ← Toggle pump on/off
   GET  /api/pump/status     ← Current pump state
   GET  /api/pump/today      ← Today's water usage
   ============================================================ */
const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// In-memory pump state (in production, this would be stored or read from ESP32)
let pumpState = {
  on: false,
  mode: 'auto',
  startedAt: null
};

// ────────────────────────────────────────────
// GET /api/pump/status
// ────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({ success: true, data: pumpState });
});

// ────────────────────────────────────────────
// POST /api/pump/toggle
// Body: { action: 'on'|'off', mode: 'auto'|'manual'|'schedule', field_id }
// ────────────────────────────────────────────
router.post('/toggle', async (req, res) => {
  try {
    const { action, mode = 'manual', field_id = 1 } = req.body;
    const desiredState = action === 'on';

    pumpState.on   = desiredState;
    pumpState.mode = mode;
    pumpState.startedAt = desiredState ? new Date().toISOString() : null;

    // Log the event
    await pool.execute(
      `INSERT INTO pump_events (field_id, action, mode) VALUES (?, ?, ?)`,
      [field_id, desiredState ? 'on' : 'off', mode]
    );

    res.json({ success: true, data: pumpState });
  } catch (err) {
    console.error('POST /api/pump/toggle error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ────────────────────────────────────────────
// GET /api/pump/today — Total water used today
// ────────────────────────────────────────────
router.get('/today', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT COALESCE(SUM(water_used_l), 0) AS total_liters,
             COUNT(*) AS cycles
      FROM pump_events
      WHERE action = 'off' AND DATE(created_at) = CURDATE()
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('GET /api/pump/today error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
