/* ============================================================
   Reset Tank to 7.0 L
   Run this to fix incorrect tank level in database
   ============================================================ */

const pool = require('./connection');

async function resetTank() {
  try {
    console.log('🔧 Resetting tank to 7.0 L...');
    
    // Get latest sensor reading ID
    const [latest] = await pool.query(
      'SELECT COALESCE(MAX(id), 0) AS max_id FROM sensor_readings'
    );
    const latestId = latest[0].max_id;
    
    // Reset tank to 7.0 L
    await pool.execute(
      `UPDATE tank_state 
       SET level_liters = 7.000, 
           last_reset = NOW(), 
           last_reading_id = ?
       WHERE id = 1`,
      [latestId]
    );
    
    console.log('✅ Tank reset to 7.000 L');
    console.log(`📌 Anchored to reading ID: ${latestId}`);
    
    // Verify
    const [result] = await pool.query('SELECT * FROM tank_state WHERE id = 1');
    console.log('📊 Current tank state:', result[0]);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetTank();
