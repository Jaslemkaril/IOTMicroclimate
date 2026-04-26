-- ============================================================
-- Seed Sample Pump Events for Testing CSV Export
-- This adds sample pump events for today and yesterday
-- ============================================================

USE terrasync;

-- Insert sample pump events for TODAY
INSERT INTO pump_events (field_id, action, mode, water_used_l, created_at) VALUES
(1, 'on',  'manual', 0.000, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(1, 'off', 'manual', 0.450, DATE_SUB(NOW(), INTERVAL 7 HOUR)),
(1, 'on',  'manual', 0.000, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(1, 'off', 'manual', 0.320, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(1, 'on',  'manual', 0.000, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 'off', 'manual', 0.280, DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- Insert sample pump events for YESTERDAY
INSERT INTO pump_events (field_id, action, mode, water_used_l, created_at) VALUES
(1, 'on',  'manual', 0.000, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 8 HOUR),
(1, 'off', 'manual', 0.550, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 9 HOUR),
(1, 'on',  'manual', 0.000, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 12 HOUR),
(1, 'off', 'manual', 0.420, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 13 HOUR),
(1, 'on',  'manual', 0.000, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 16 HOUR),
(1, 'off', 'manual', 0.380, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 17 HOUR);

SELECT 'Sample pump events inserted successfully!' AS status;
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS total_events,
    SUM(water_used_l) AS total_water_used
FROM pump_events
WHERE DATE(created_at) >= CURDATE() - INTERVAL 1 DAY
GROUP BY DATE(created_at)
ORDER BY date DESC;
