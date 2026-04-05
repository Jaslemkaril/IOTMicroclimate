-- ============================================================
-- TerraSync — Database Schema
-- MySQL  |  2026
-- ============================================================

CREATE DATABASE IF NOT EXISTS terrasync
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE terrasync;

-- ──────────────────────────────────────────────
-- Fields / Zones
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fields (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  crop        VARCHAR(100)  DEFAULT NULL,
  crop_icon   VARCHAR(50)   DEFAULT 'fa-leaf',
  status      ENUM('healthy','warning','critical') DEFAULT 'healthy',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────
-- Sensor Readings  (one row per reading cycle)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensor_readings (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  field_id    INT           NOT NULL,
  moisture    DECIMAL(5,2)  DEFAULT NULL,   -- %
  temperature DECIMAL(5,2)  DEFAULT NULL,   -- °C
  humidity    DECIMAL(5,2)  DEFAULT NULL,   -- %
  water_flow  DECIMAL(6,2)  DEFAULT NULL,   -- L/min
  recorded_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_field_time (field_id, recorded_at),
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────
-- Alerts
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  field_id    INT           DEFAULT NULL,
  type        ENUM('info','success','warning','danger') DEFAULT 'info',
  title       VARCHAR(200)  NOT NULL,
  message     TEXT,
  is_read     TINYINT(1)    DEFAULT 0,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_created (created_at),
  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────
-- Pump / Irrigation Events
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pump_events (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  field_id      INT           DEFAULT NULL,
  action        ENUM('on','off') NOT NULL,
  mode          ENUM('auto','manual','schedule') DEFAULT 'manual',
  water_used_l  DECIMAL(8,2) DEFAULT 0,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ──────────────────────────────────────────────
-- Tank State  (single-row, id=1)
-- Tracks current water level accounting for flow sensor data.
-- Pipe dead volume: π × (0.01m)² × 2m ≈ 0.628 L
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tank_state (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  level_liters     DECIMAL(6,3)  NOT NULL DEFAULT 7.000,
  last_reset       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  last_reading_id  BIGINT        DEFAULT 0,
  updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Upsert so re-running schema never overwrites an existing level
INSERT INTO tank_state (id, level_liters, last_reading_id)
  VALUES (1, 7.000, 0)
  ON DUPLICATE KEY UPDATE id = 1;

-- ──────────────────────────────────────────────
-- Pump State  (single-row, id=1)
-- Persists pump on/off state across server restarts.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pump_state (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  is_on      TINYINT(1)  NOT NULL DEFAULT 0,
  mode       VARCHAR(20) NOT NULL DEFAULT 'manual',
  started_at TIMESTAMP   NULL     DEFAULT NULL,
  updated_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO pump_state (id, is_on, mode)
  VALUES (1, 0, 'manual')
  ON DUPLICATE KEY UPDATE id = 1;

-- ──────────────────────────────────────────────
-- Seed data — Fields  (only if table is empty)
-- ──────────────────────────────────────────────
INSERT INTO fields (name, crop, crop_icon, status)
SELECT name, crop, crop_icon, status FROM (
  SELECT 'Jaslem Farm' AS name, 'Mixed Crops' AS crop, 'fa-seedling' AS crop_icon, 'healthy' AS status
) AS seed
WHERE (SELECT COUNT(*) FROM fields) = 0;

-- ──────────────────────────────────────────────
-- Seed data — Sample sensor readings (only if table is empty)
-- ──────────────────────────────────────────────
INSERT INTO sensor_readings (field_id, moisture, temperature, humidity, water_flow, recorded_at)
SELECT
  1,
  50 + (RAND() * 10 - 5),
  26 + (RAND() * 4 - 2),
  60 + (RAND() * 10 - 5),
  0,
  DATE_SUB(NOW(), INTERVAL seq HOUR)
FROM (
  SELECT 0 AS seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
  UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
  UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
  UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
  UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
  UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23
) AS hours
WHERE (SELECT COUNT(*) FROM sensor_readings) = 0;

-- ──────────────────────────────────────────────
-- Seed data — Sample alerts  (only if table is empty)
-- ──────────────────────────────────────────────
INSERT INTO alerts (field_id, type, title, message)
SELECT field_id, type, title, message FROM (
  SELECT 1 AS field_id, 'info' AS type, 'System Ready' AS title, 'TerraSync is online. ESP32 connected and monitoring Jaslem Farm.' AS message
) AS seed
WHERE (SELECT COUNT(*) FROM alerts) = 0;
