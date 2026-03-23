/* ============================================================
   TerraSync — Tank Routes
   GET  /api/tank        ← Current level, %, status
   POST /api/tank/reset  ← Mark tank as refilled (resets to 7 L)

   Tank specs:
     Capacity  : 7 L
     Pipe dia. : 2 cm  (radius 0.01 m)
     Pipe len. : 2 m
     Dead vol. : π × (0.01)² × 2 × 1000 ≈ 0.628 L
   ============================================================ */
const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

const TANK_CAPACITY_L = 7.0;
// Pipe dead volume in litres (water that stays in pipe — can't be pumped out)
const PIPE_DEAD_VOL_L = +(Math.PI * Math.pow(0.01, 2) * 2 * 1000).toFixed(3); // 0.628 L

// ────────────────────────────────────────────
// GET /api/tank — current water level
// ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tank_state WHERE id = 1');
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Tank state not initialised' });
    }

    const level      = Math.max(0, parseFloat(rows[0].level_liters));
    const pct        = +Math.min(100, (level / TANK_CAPACITY_L) * 100).toFixed(1);
    const usable     = +Math.max(0, level - PIPE_DEAD_VOL_L).toFixed(3);
    const usablePct  = +Math.min(100,
      (usable / Math.max(0.001, TANK_CAPACITY_L - PIPE_DEAD_VOL_L)) * 100
    ).toFixed(1);

    const status =
      level <= PIPE_DEAD_VOL_L ? 'empty'    :
      level <= 1.5             ? 'critical' :
      pct   <= 25              ? 'low'      :
      pct   <= 50              ? 'half'     :
      pct   <= 75              ? 'good'     : 'full';

    res.json({
      success: true,
      data: {
        level_liters:     +level.toFixed(3),
        capacity_liters:  TANK_CAPACITY_L,
        pipe_dead_liters: PIPE_DEAD_VOL_L,
        percent:          pct,
        usable_liters:    usable,
        usable_percent:   usablePct,
        status,
        last_reset:       rows[0].last_reset,
        updated_at:       rows[0].updated_at
      }
    });
  } catch (err) {
    console.error('GET /api/tank error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ────────────────────────────────────────────
// POST /api/tank/reset — mark tank as refilled
// Sets level back to TANK_CAPACITY_L and anchors
// last_reading_id so past readings are not re-integrated.
// ────────────────────────────────────────────
router.post('/reset', async (req, res) => {
  try {
    const [latest] = await pool.query(
      'SELECT COALESCE(MAX(id), 0) AS max_id FROM sensor_readings'
    );
    const latestId = latest[0].max_id;

    await pool.execute(
      `UPDATE tank_state
         SET level_liters = ?, last_reset = NOW(), last_reading_id = ?
       WHERE id = 1`,
      [TANK_CAPACITY_L, latestId]
    );

    await pool.execute(
      `INSERT INTO alerts (field_id, type, title, message) VALUES (1, 'success', ?, ?)`,
      [
        '💧 Tank Refilled',
        `Water tank reset to full capacity (${TANK_CAPACITY_L} L) at ${new Date().toLocaleString()}.`
      ]
    );

    res.json({
      success: true,
      data: { level_liters: TANK_CAPACITY_L, percent: 100, status: 'full' }
    });
  } catch (err) {
    console.error('POST /api/tank/reset error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
