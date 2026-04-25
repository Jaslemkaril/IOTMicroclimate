/* ============================================================
   TerraSync — Database Initializer
   Can be called as a module (from server startup)
   or run directly:  npm run db:init
   ============================================================ */
const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function initDatabase({ silent = false } = {}) {
  let conn;
  try {
    conn = await mysql.createConnection({
      host:               process.env.DB_HOST     || 'localhost',
      port:               parseInt(process.env.DB_PORT, 10) || 3306,
      user:               process.env.DB_USER     || 'root',
      password:           process.env.DB_PASSWORD || '',
      // On managed hosts (Railway, PlanetScale, etc.) the database already
      // exists — connect straight to it. Locally we omit it so CREATE DATABASE
      // in schema.sql can create it on first run.
      database:           process.env.DB_NAME     || undefined,
      ssl:                process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      multipleStatements: true
    });

    const schemaPath = path.join(__dirname, 'schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf-8');

    // Railway / managed MySQL already provisions the database;
    // skip CREATE DATABASE and USE so we don't error on restricted hosts.
    if (process.env.DB_NAME) {
      sql = sql.replace(/CREATE DATABASE\s+[^;]+;/gi, '')
               .replace(/USE\s+[^;]+;/gi, '');
    }

    if (!silent) console.log('⏳ Running schema.sql …');
    await conn.query(sql);
    if (!silent) console.log('✅ Database "terrasync" ready.');

    // ── Migrate to 4-plant setup ──────────────────────────────
    // If the fields table has old single-field data (Jaslem Farm / Mak),
    // replace it with the 4 coded plant fields.
    const [fields] = await conn.query('SELECT id, name FROM fields ORDER BY id');
    const names = fields.map(f => f.name);
    const isOldSetup = names.length < 4 ||
      names.some(n => ['Jaslem Farm', 'Mak'].includes(n));

    if (isOldSetup) {
      if (!silent) console.log('🌱 Migrating to 4-plant setup…');
      await conn.query('DELETE FROM fields');
      await conn.query('ALTER TABLE fields AUTO_INCREMENT = 1');
      await conn.query(`
        INSERT INTO fields (name, crop, crop_icon, status) VALUES
          ('Plant-A', 'Sensor 1', 'fa-seedling', 'healthy'),
          ('Plant-B', 'Sensor 2', 'fa-leaf',     'healthy'),
          ('Plant-C', 'Sensor 3', 'fa-cannabis', 'healthy'),
          ('Plant-D', 'Sensor 4', 'fa-spa',      'healthy')
      `);
      // Clear ALL seed readings so no fake data appears on the dashboard.
      // Real data only comes in once an actual ESP32 starts posting.
      await conn.query(`DELETE FROM sensor_readings WHERE field_id IN (1,2,3,4)`);
      await conn.query(`DELETE FROM alerts WHERE title = 'System Ready'`);
      if (!silent) console.log('✅ 4 plant fields ready: Plant-A, Plant-B, Plant-C, Plant-D');
    }

    // ── Purge leftover seed readings ─────────────────────────
    // The schema seeds exactly 24 hourly rows with water_flow = 0.
    // Real ESP32 data posts every 10s so it quickly exceeds 24 rows.
    // If a field has exactly 24 rows and all have water_flow = 0,
    // it's still the seed data — wipe it.
    const [seedCheck] = await conn.query(`
      SELECT field_id, COUNT(*) AS cnt,
             SUM(CASE WHEN water_flow = 0 OR water_flow IS NULL THEN 1 ELSE 0 END) AS zero_flow
      FROM sensor_readings
      GROUP BY field_id
      HAVING cnt = zero_flow AND cnt <= 24
    `);
    if (seedCheck.length > 0) {
      const ids = seedCheck.map(r => r.field_id);
      await conn.query(`DELETE FROM sensor_readings WHERE field_id IN (?)`, [ids]);
      if (!silent) console.log(`🧹 Purged seed readings for field_id(s): ${ids.join(', ')}`);
    }

    return true;
  } catch (err) {
    if (!silent) {
      console.error('❌ Database init failed:', err.message || err);
      if (err.code === 'ECONNREFUSED')
        console.error('💡 Make sure MySQL is running (XAMPP → Start MySQL)');
      if (err.code === 'ER_ACCESS_DENIED_ERROR')
        console.error('💡 Check DB_USER and DB_PASSWORD in .env');
    }
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

// ── Run as CLI: node server/db/init.js ─────────────────────
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initDatabase };
