-- ============================================================
-- MIGRASI: KOLOM TAMBAHAN SENSOR SHT31 (NodeMCU / ESP8266)
-- Target database : pengujian
-- Jalankan        : mysql -h 127.0.0.1 -u root pengujian < data/migration_dht_log_sht31.sql
--
-- Menambah kolom OPSIONAL (NULL) pada tabel dht_log, karena sketch SHT31
-- mengirim data lebih lengkap daripada DHT11:
--   device_id, dew_point, heat_index, temperature_status, humidity_status
--
-- Idempotent: aman dijalankan berulang (dicek lewat information_schema).
-- ============================================================

USE pengujian;

-- device_id (mis. "SHT31-RUANGAN-01")
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'dht_log' AND column_name = 'device_id') = 0,
  'ALTER TABLE dht_log ADD COLUMN device_id VARCHAR(100) NULL AFTER ruangan',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- dew_point (titik embun, °C)
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'dht_log' AND column_name = 'dew_point') = 0,
  'ALTER TABLE dht_log ADD COLUMN dew_point DECIMAL(5,2) NULL AFTER kelembapan',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- heat_index (indeks panas, °C)
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'dht_log' AND column_name = 'heat_index') = 0,
  'ALTER TABLE dht_log ADD COLUMN heat_index DECIMAL(5,2) NULL AFTER dew_point',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- temperature_status (mis. "NYAMAN", "PANAS")
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'dht_log' AND column_name = 'temperature_status') = 0,
  'ALTER TABLE dht_log ADD COLUMN temperature_status VARCHAR(30) NULL AFTER heat_index',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- humidity_status (mis. "NORMAL", "LEMBAP")
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'dht_log' AND column_name = 'humidity_status') = 0,
  'ALTER TABLE dht_log ADD COLUMN humidity_status VARCHAR(30) NULL AFTER temperature_status',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
