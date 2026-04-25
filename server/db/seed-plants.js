/* ============================================================
   TerraSync — Seed 4 Plant Fields
   Run this once to replace existing fields with 4 coded plants.
   Usage: node server/db/seed-plants.js
   ============================================================ */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedPlants() {
  let conn;
  try {
    // Support full URL connection string (Railway public URL)
    const connectionConfig = process.env.MYSQL_PUBLIC_URL
      ? process.env.MYSQL_PUBLIC_URL
      : {
          host:     process.env.DB_HOST || 'localhost',
          port:     parseInt(process.env.DB_PORT, 10) || 3306,
          user:     process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'terrasync',
          ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
        };

    conn = await mysql.createConnection(connectionConfig);

    console.log('🌱 Clearing existing fields...');
    await conn.execute('DELETE FROM fields');

    console.log('🌱 Seeding 4 plant fields...');
    const plants = [
      { name: 'Plant-A', crop: 'Sensor 1', icon: 'fa-seedling' },
      { name: 'Plant-B', crop: 'Sensor 2', icon: 'fa-leaf' },
      { name: 'Plant-C', crop: 'Sensor 3', icon: 'fa-cannabis' },
      { name: 'Plant-D', crop: 'Sensor 4', icon: 'fa-spa' }
    ];

    for (const p of plants) {
      await conn.execute(
        'INSERT INTO fields (name, crop, crop_icon, status) VALUES (?, ?, ?, ?)',
        [p.name, p.crop, p.icon, 'healthy']
      );
    }

    console.log('✅ 4 plant fields created:');
    console.log('   • Plant-A (Sensor 1) — field_id: 1');
    console.log('   • Plant-B (Sensor 2) — field_id: 2');
    console.log('   • Plant-C (Sensor 3) — field_id: 3');
    console.log('   • Plant-D (Sensor 4) — field_id: 4');
    console.log('\n💡 Update your ESP32 firmware to POST to the correct field_id for each sensor.');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

seedPlants();
