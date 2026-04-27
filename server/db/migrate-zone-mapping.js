/* ============================================================
   TerraSync — Zone Mapping Migration
   Maps each field to a specific soil moisture sensor zone
   ============================================================ */

const pool = require('./connection');

async function migrateZoneMapping() {
  console.log('🔄 Starting zone mapping migration...\n');

  try {
    // Step 1: Add zone_sensor column to fields table (if not exists)
    console.log('Step 1: Adding zone_sensor column to fields table...');
    try {
      await pool.execute(`
        ALTER TABLE fields 
        ADD COLUMN zone_sensor INT DEFAULT NULL 
        COMMENT 'Maps to moisture_1, moisture_2, moisture_3, or moisture_4'
      `);
      console.log('✅ Column added\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ Column already exists\n');
      } else {
        throw err;
      }
    }

    // Step 2: Update existing fields to map to zones
    console.log('Step 2: Mapping existing fields to zones...');
    
    // Get current fields
    const [fields] = await pool.query('SELECT id, name FROM fields ORDER BY id');
    console.log(`Found ${fields.length} fields:\n`);
    
    // Map fields to zones (1-4)
    const zoneMapping = [
      { id: 1, zone: 1, zoneName: 'Zone A (NW)' },  // Mark → Zone A
      { id: 2, zone: 2, zoneName: 'Zone B (NE)' },  // Collen → Zone B
      { id: 3, zone: 3, zoneName: 'Zone C (SW)' },  // Jaslem → Zone C
      { id: 4, zone: 4, zoneName: 'Zone D (SE)' }   // Jas → Zone D
    ];

    for (const mapping of zoneMapping) {
      const field = fields.find(f => f.id === mapping.id);
      if (field) {
        await pool.execute(
          'UPDATE fields SET zone_sensor = ? WHERE id = ?',
          [mapping.zone, mapping.id]
        );
        console.log(`  ✓ ${field.name} (ID ${field.id}) → ${mapping.zoneName} (moisture_${mapping.zone})`);
      }
    }

    console.log('\n✅ Zone mapping migration completed successfully!\n');
    console.log('📊 Field → Zone Mapping:');
    console.log('  • Mark (Field 1)   → Zone A (moisture_1 on GPIO34)');
    console.log('  • Collen (Field 2) → Zone B (moisture_2 on GPIO35)');
    console.log('  • Jaslem (Field 3) → Zone C (moisture_3 on GPIO32)');
    console.log('  • Jas (Field 4)    → Zone D (moisture_4 on GPIO33)\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run migration
migrateZoneMapping().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
