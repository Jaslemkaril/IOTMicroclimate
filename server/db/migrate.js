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

      // Check if columns already exist
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'sensor_readings' 
          AND COLUMN_NAME IN ('moisture_1', 'moisture_2', 'moisture_3', 'moisture_4')
      `);

      const existingColumns = columns.map(c => c.COLUMN_NAME);

      // Add columns one by one if they don't exist
      if (!existingColumns.includes('moisture_1')) {
        await pool.execute(`
          ALTER TABLE sensor_readings
          ADD COLUMN moisture_1 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone A (NW)' AFTER moisture
        `);
        console.log('[Migration]   ✓ Added moisture_1 column');
      }

      if (!existingColumns.includes('moisture_2')) {
        await pool.execute(`
          ALTER TABLE sensor_readings
          ADD COLUMN moisture_2 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone B (NE)' AFTER moisture_1
        `);
        console.log('[Migration]   ✓ Added moisture_2 column');
      }

      if (!existingColumns.includes('moisture_3')) {
        await pool.execute(`
          ALTER TABLE sensor_readings
          ADD COLUMN moisture_3 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone C (SW)' AFTER moisture_2
        `);
        console.log('[Migration]   ✓ Added moisture_3 column');
      }

      if (!existingColumns.includes('moisture_4')) {
        await pool.execute(`
          ALTER TABLE sensor_readings
          ADD COLUMN moisture_4 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone D (SE)' AFTER moisture_3
        `);
        console.log('[Migration]   ✓ Added moisture_4 column');
      }

      // Update existing rows
      await pool.execute(`
        UPDATE sensor_readings
        SET 
          moisture_1 = COALESCE(moisture_1, moisture),
          moisture_2 = COALESCE(moisture_2, moisture),
          moisture_3 = COALESCE(moisture_3, moisture),
          moisture_4 = COALESCE(moisture_4, moisture)
        WHERE moisture IS NOT NULL
      `);
      console.log('[Migration]   ✓ Updated existing rows');

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
    console.error('[Migration] Stack:', err.stack);
    // Don't throw - let server start anyway
  }
}

module.exports = { runMigrations };
