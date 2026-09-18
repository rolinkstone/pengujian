-- ============================================================
-- MIGRASI: TABEL PEMANTAUAN SUHU & KELEMBAPAN (DHT11/NodeMCU)
-- Target database : pengujian
-- Jalankan        : mysql -h 127.0.0.1 -u root pengujian < data/migration_dht_log.sql
-- (idempotent — aman dijalankan ulang)
-- ============================================================

USE pengujian;

CREATE TABLE IF NOT EXISTS dht_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ruangan VARCHAR(100) NOT NULL,
    suhu DECIMAL(5,2) NOT NULL,
    kelembapan DECIMAL(5,2) NOT NULL,
    waktu DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ruangan_waktu (ruangan, waktu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
