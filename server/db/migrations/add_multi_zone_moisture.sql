-- ============================================================
-- Migration: Add Multi-Zone Soil Moisture Support
-- Adds 4 individual moisture sensor columns to sensor_readings
-- ============================================================

USE terrasync;

-- Add new columns for 4 moisture sensors (if they don't exist)
ALTER TABLE sensor_readings
  ADD COLUMN IF NOT EXISTS moisture_1 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone A (NW)' AFTER moisture,
  ADD COLUMN IF NOT EXISTS moisture_2 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone B (NE)' AFTER moisture_1,
  ADD COLUMN IF NOT EXISTS moisture_3 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone C (SW)' AFTER moisture_2,
  ADD COLUMN IF NOT EXISTS moisture_4 DECIMAL(5,2) DEFAULT NULL COMMENT '% Zone D (SE)' AFTER moisture_3;

-- Update existing rows: copy moisture to all 4 zones for backward compatibility
UPDATE sensor_readings
SET 
  moisture_1 = moisture,
  moisture_2 = moisture,
  moisture_3 = moisture,
  moisture_4 = moisture
WHERE moisture_1 IS NULL AND moisture IS NOT NULL;

SELECT 'Migration completed: Multi-zone moisture sensors added' AS status;
