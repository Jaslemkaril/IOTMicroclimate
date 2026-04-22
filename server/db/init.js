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
