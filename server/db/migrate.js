/* ============================================================
   TerraSync — Database Migration Runner
   Automatically runs migrations on server startup
   ============================================================ */
const pool = require('./connection');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('[Migration] Checking for pending migrations...');

  try {
    // Create migrations table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if multi-zone migration has been run
    const [rows] = await pool.query(
      `SELECT * FROM migrations WHERE name = 'add_multi_zone_moisture'`
    );

    if (rows.length === 0) {
      console.log('[Migration] Running: add_multi_zone_moisture...');

      // Add new columns for 4 moisture sensors
      await pool.execute(`
        ALTER TABLE sensor_readings
          ADD COLUMN IF NOT EXISTS moisture_1 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone A (NW)' AFTER moisture,
          ADD COLUMN IF NOT EXISTS moisture_2 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone B (NE)' AFTER moisture_1,
          ADD COLUMN IF NOT EXISTS moisture_3 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone C (SW)' AFTER moisture_2,
          ADD COLUMN IF NOT EXISTS moisture_4 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone D (SE)' AFTER moisture_3
      `);

      // Update existing rows
      await pool.execute(`
        UPDATE sensor_readings
        SET 
          moisture_1 = moisture,
          moisture_2 = moisture,
          moisture_3 = moisture,
          moisture_4 = moisture
        WHERE moisture_1 IS NULL AND moisture IS NOT NULL
      `);

      // Mark migration as complete
      await pool.execute(
        `INSERT INTO migrations (name) VALUES ('add_multi_zone_moisture')`
      );

      console.log('[Migration] ✅ add_multi_zone_moisture completed successfully!');
    } else {
      console.log('[Migration] ✅ All migrations up to date');
    }
  } catch (err) {
    console.error('[Migration] ❌ Error running migrations:', err.message);
    throw err;
  }
}

module.exports = { runMigrations };
