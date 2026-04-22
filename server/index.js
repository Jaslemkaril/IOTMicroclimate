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
app.use('/api/tank',    require('./routes/tank'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const pool = require('./db/connection');
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
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

  app.listen(PORT, '0.0.0.0', () => {
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

  // ── Tank Flow Integration Worker ─────────────────
  // Every 10 s: reads new flow sensor values from sensor_readings
  // and deducts consumed volume from tank_state.
  // Pipe dead vol ≈ 0.628 L  (π × r² × L  |  r=0.01 m, L=2 m)
  const { TANK_CAPACITY_L: TANK_CAP_L, PIPE_DEAD_VOL_L: PIPE_DEAD_L, TANK_LOW_L } = require('./constants');
  const ALERT_COOLDOWN_MS  = 3_600_000; // 1 hour between same-type alerts
  let lastLowAlertAt       = 0;
  let lastCriticalAlertAt  = 0;

  async function integrateTankFlow() {
    const db = require('./db/connection');
    const [stateRows] = await db.query('SELECT * FROM tank_state WHERE id = 1');
    if (!stateRows.length) return;
    const state = stateRows[0];

    // Fetch only NEW readings since the last processed id
    const [readings] = await db.query(
      `SELECT id, water_flow, recorded_at FROM sensor_readings
         WHERE id > ? ORDER BY id ASC LIMIT 100`,
      [state.last_reading_id || 0]
    );
    if (!readings.length) return;

    let consumed = 0;
    let lastId   = parseInt(state.last_reading_id) || 0;
    let prevTime = new Date(state.updated_at);

    for (const r of readings) {
      const currTime   = new Date(r.recorded_at);
      const elapsedMin = (currTime - prevTime) / 60_000;
      const flowLpm    = parseFloat(r.water_flow) || 0;
      // Accept only realistic YF-S201 range (0.5 – 30 L/min); ignore noise
      if (flowLpm >= 0.5 && flowLpm < 30 && elapsedMin > 0 && elapsedMin < 5) {
        consumed += flowLpm * elapsedMin;
      }
      prevTime = currTime;
      lastId   = r.id;
    }

    const newLevel = +Math.max(0, parseFloat(state.level_liters) - consumed).toFixed(3);
    await db.execute(
      'UPDATE tank_state SET level_liters = ?, last_reading_id = ? WHERE id = 1',
      [newLevel, lastId]
    );

    const pct = (newLevel / TANK_CAP_L) * 100;
    const now = Date.now();

    if (newLevel <= PIPE_DEAD_L && (now - lastCriticalAlertAt) > ALERT_COOLDOWN_MS / 2) {
      lastCriticalAlertAt = now;
      await db.execute(
        `INSERT INTO alerts (field_id, type, title, message) VALUES (1, 'danger', ?, ?)`,
        [
          '\uD83D\uDEA8 Tank Empty!',
          `Tank is in the pipe dead zone (${newLevel.toFixed(2)} L). Pump cannot draw water — refill immediately.`
        ]
      );
    } else if (newLevel <= TANK_LOW_L && (now - lastLowAlertAt) > ALERT_COOLDOWN_MS) {
      lastLowAlertAt = now;
      await db.execute(
        `INSERT INTO alerts (field_id, type, title, message) VALUES (1, 'warning', ?, ?)`,
        [
          '\u26A0\uFE0F Water Tank Low',
          `Tank is at ${pct.toFixed(0)}% (${newLevel.toFixed(2)} L remaining). Refill soon to avoid dry-run.`
        ]
      );
    }
  }

  setInterval(() => integrateTankFlow().catch(() => {}), 10_000);

  // ── Data Retention Worker ───────────────────────────
  // Every 24 h: prune sensor_readings older than 30 days.
  // At ~5 s per reading ≈ 17 000 rows/day; keeps the table bounded.
  async function pruneOldReadings() {
    const db = require('./db/connection');
    const [result] = await db.execute(
      'DELETE FROM sensor_readings WHERE recorded_at < NOW() - INTERVAL 30 DAY'
    );
    if (result.affectedRows > 0) {
      console.log(`[Retention] Pruned ${result.affectedRows} sensor readings older than 30 days.`);
    }
  }
  setInterval(() => pruneOldReadings().catch(err => console.error('[Retention] Error:', err.message)), 24 * 60 * 60 * 1000);
  // Run once on startup to handle backlogs
  pruneOldReadings().catch(() => {});
}

start();
