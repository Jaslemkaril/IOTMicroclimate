-- TerraSync — Seed 4 Plant Fields
-- Run this in Railway MySQL → Database tab → Query

-- Clear existing fields (cascade deletes sensor_readings too)
DELETE FROM fields;

-- Reset auto-increment so IDs start from 1
ALTER TABLE fields AUTO_INCREMENT = 1;

-- Insert 4 plant fields
INSERT INTO fields (name, crop, crop_icon, status) VALUES
  ('Plant-A', 'Sensor 1', 'fa-seedling', 'healthy'),
  ('Plant-B', 'Sensor 2', 'fa-leaf',     'healthy'),
  ('Plant-C', 'Sensor 3', 'fa-cannabis', 'healthy'),
  ('Plant-D', 'Sensor 4', 'fa-spa',      'healthy');

-- Verify
SELECT id, name, crop, crop_icon FROM fields;
