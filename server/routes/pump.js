/* ============================================================
   TerraSync — Pump / Irrigation Routes
   POST /api/pump/toggle     ← Toggle pump on/off
   GET  /api/pump/status     ← Current pump state
   GET  /api/pump/today      ← Today's water usage
   ============================================================ */
const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// ── Helpers ──────────────────────────────────────────────────

// Load pump state from DB.  Falls back to safe defaults if the
// pump_state row doesn't exist yet (e.g. pre-migration DB).
async function loadState() {
  const [rows] = await pool.query('SELECT * FROM pump_state WHERE id = 1');
  if (!rows.length) return { on: false, mode: 'manual', startedAt: null };
  return {
    on:        rows[0].is_on === 1,
    mode:      rows[0].mode,
    startedAt: rows[0].started_at ? new Date(rows[0].started_at).toISOString() : null
  };
}

// Integrate flow sensor readings between startedAt and now → litres used.
// Same logic as the tank background worker (YF-S201 range filter).
async function calcWaterUsed(startedAt) {
  if (!startedAt) return 0;
  const [readings] = await pool.query(
    `SELECT water_flow, recorded_at FROM sensor_readings
       WHERE recorded_at > ? ORDER BY recorded_at ASC`,
    [startedAt]
  );
  if (!readings.length) return 0;

  let used = 0;
  let prev = new Date(startedAt);
  for (const r of readings) {
    const curr       = new Date(r.recorded_at);
    const elapsedMin = (curr - prev) / 60_000;
    const lpm        = parseFloat(r.water_flow) || 0;
    if (lpm >= 0.5 && lpm < 30 && elapsedMin > 0 && elapsedMin < 5) {
      used += lpm * elapsedMin;
    }
    prev = curr;
  }
  return +used.toFixed(3);
}

// ────────────────────────────────────────────
// GET /api/pump/status
// ────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const state = await loadState();
    console.log(`[PUMP] Status check: on=${state.on}, mode=${state.mode}`);
    res.json({ success: true, data: state });
  } catch (err) {
    console.error('GET /api/pump/status error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────
// POST /api/pump/toggle
// Body: { action: 'on'|'off', mode: 'auto'|'manual'|'schedule', field_id }
// ────────────────────────────────────────────
router.post('/toggle', async (req, res) => {
  try {
    const { action, mode = 'manual', field_id = 1 } = req.body;
    if (!['on', 'off'].includes(action)) {
      return res.status(400).json({ success: false, error: "action must be 'on' or 'off'" });
    }

    const current   = await loadState();
    const desiredOn = action === 'on';

    // Calculate water used when turning the pump off
    let waterUsed = 0;
    if (!desiredOn && current.on && current.startedAt) {
      waterUsed = await calcWaterUsed(current.startedAt);
    }

    const newStartedAt = desiredOn ? new Date() : null;

    // Persist state to DB
    await pool.execute(
      `UPDATE pump_state SET is_on = ?, mode = ?, started_at = ? WHERE id = 1`,
      [desiredOn ? 1 : 0, mode, newStartedAt]
    );

    // Log the event with calculated water usage
    await pool.execute(
      `INSERT INTO pump_events (field_id, action, mode, water_used_l) VALUES (?, ?, ?, ?)`,
      [field_id, action, mode, waterUsed]
    );

    const newState = {
      on:        desiredOn,
      mode,
      startedAt: newStartedAt ? newStartedAt.toISOString() : null
    };
    
    console.log(`[PUMP] Toggle: action=${action}, desiredOn=${desiredOn}, mode=${mode}, waterUsed=${waterUsed}L`);
    res.json({ success: true, data: newState });
  } catch (err) {
    console.error('POST /api/pump/toggle error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
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
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
