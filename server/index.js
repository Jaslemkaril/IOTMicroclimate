/* ============================================================
   TerraSync — Express API Server
   ============================================================ */
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const os      = require('os');
require('dotenv').config();

const { initDatabase } = require('./db/init');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────
app.use(cors());
app.use(express.json());

// Serve the frontend (index.html, css/, js/)
app.use(express.static(path.join(__dirname, '..')));

// ── API Routes ─────────────────────────────
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/fields',  require('./routes/fields'));
app.use('/api/alerts',  require('./routes/alerts'));
app.use('/api/pump',    require('./routes/pump'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const pool = require('./db/connection');
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// ── Helpers ────────────────────────────────
function getLanIPs() {
  const ifaces = os.networkInterfaces();
  return Object.entries(ifaces)
    .flatMap(([name, addrs]) =>
      (addrs || [])
        .filter(a => a.family === 'IPv4' && !a.internal)
        .map(a => ({ name, address: a.address }))
    );
}

// ── Startup ────────────────────────────────
async function start() {
  // Auto-initialize database (idempotent — safe to run every time)
  try {
    await initDatabase({ silent: true });
    console.log('✅ Database ready.');
  } catch (err) {
    console.error('⚠️  Database connection failed:', err.message);
    console.error('   → Make sure MySQL is running (XAMPP → Start MySQL)');
    console.error('   → Check credentials in .env\n');
  }

  app.listen(PORT, () => {
    const lanIPs = getLanIPs();

    console.log('\n┌─────────────────────────────────────────────────┐');
    console.log('│        🌱  TerraSync Dashboard is running        │');
    console.log('├─────────────────────────────────────────────────┤');
    console.log(`│  Local:   http://localhost:${PORT}                  │`);
    lanIPs.forEach(({ address }) => {
      const padded = `http://${address}:${PORT}`.padEnd(41);
      console.log(`│  Network: ${padded}  │`);
    });
    console.log('├─────────────────────────────────────────────────┤');
    if (lanIPs.length > 0) {
      console.log('│  📡 ESP32 config.h  →  SERVER_BASE_URL:          │');
      lanIPs.forEach(({ address }) => {
        const url = `"http://${address}:${PORT}"`.padEnd(41);
        console.log(`│      ${url}  │`);
      });
    } else {
      console.log('│  ⚠️  No LAN IP found — connect to a network first  │');
    }
    console.log('└─────────────────────────────────────────────────┘\n');
  });
}

start();
