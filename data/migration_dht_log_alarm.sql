-- ============================================================
-- MIGRASI: KOLOM STATUS ALARM PEMANTAUAN SUHU (dht_log)
-- Target database : pengujian
-- Jalankan        : mysql -h 127.0.0.1 -u root pengujian < data/migration_dht_log_alarm.sql
--
-- Menambah kolom OPSIONAL (NULL) pada tabel dht_log:
--   alarm_status -> dikirim sketch NodeMCU saat suhu melewati BATAS_SUHU, mis.
--                   "AKTIF"  = alarm menyala (suhu di atas batas)
--                   "NORMAL" = suhu masih dalam batas
--
-- Perangkat yang TIDAK mengirim field ini akan menyimpan NULL; aplikasi
-- (components/pemantauan-suhu/helper.js -> alarmInfo) memakai perkiraan
-- dari temperature_status sebagai cadangan.
--
-- Idempotent: aman dijalankan berulang (dicek lewat information_schema).
-- ============================================================

USE pengujian;

-- alarm_status (mis. "AKTIF", "NORMAL")
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'dht_log' AND column_name = 'alarm_status') = 0,
  'ALTER TABLE dht_log ADD COLUMN alarm_status VARCHAR(30) NULL AFTER humidity_status',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
