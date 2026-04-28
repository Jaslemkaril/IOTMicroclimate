/* ============================================================
   EMERGENCY: Force Reset Tank to 7.0 L
   Add this as a temporary route to force-fix the tank
   ============================================================ */
const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

router.post('/force-reset', async (req, res) => {
  try {
    console.log('🚨 FORCE RESETTING TANK TO 7.0 L');
    
    // Get latest sensor reading
    const [latest] = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM sensor_readings');
    const latestId = latest[0].max_id;
    
    // Force update to 7.0 L
    const [result] = await pool.execute(
      `UPDATE tank_state 
       SET level_liters = 7.000, 
           last_reset = NOW(), 
           last_reading_id = ?,
           updated_at = NOW()
       WHERE id = 1`,
      [latestId]
    );
    
    console.log('✅ Tank force-reset complete:', result);
    
    // Verify
    const [verify] = await pool.query('SELECT * FROM tank_state WHERE id = 1');
    console.log('📊 New tank state:', verify[0]);
    
    res.json({
      success: true,
      message: 'Tank force-reset to 7.000 L',
      data: verify[0]
    });
  } catch (err) {
    console.error('❌ Force reset error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
