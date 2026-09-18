// backend/routes/sensor.js
/**
 * ROUTER PEMANTAUAN SUHU & KELEMBAPAN (DHT / NodeMCU)
 * -----------------------------------------------------
 * Konversi dari PHP lama (dht_post.php, load_data.php, export_txt.php)
 * ke Express. Data disimpan di database "pengujian", tabel "dht_log".
 *
 * SUMBER DATA: HANYA sensor NodeMCU/DHT milik sendiri (tidak ada lagi
 * penarikan/sinkronisasi dari sumber luar).
 *
 * Endpoint ingest menerima GET (query string) MAUPUN POST body JSON.
 *   GET  /api/sensor/ingest?suhu=31.5&kelembapan=60&ruangan=server
 *   POST /api/sensor/ingest  (JSON, dipakai sketch SHT31/ESP8266)
 *        { "device_id":"SHT31-RUANGAN-01", "reading_date":"2026-09-14",
 *          "reading_time":"20:15:00", "temperature":28.4, "humidity":61.2,
 *          "dew_point":20.1, "heat_index":28.9,
 *          "temperature_status":"NYAMAN", "humidity_status":"NORMAL",
 *          "alarm_status":"AKTIF" }
 *        `alarm_status` diisi "AKTIF" bila suhu melewati batas alarm di sketch
 *        (mis. BATAS_SUHU 25°C) dan "NORMAL" bila masih dalam batas; opsional.
 *
 * Endpoint untuk dashboard:
 *   GET /api/sensor/ping               -> cek koneksi (tanpa data sensor)
 *   GET /api/sensor/info               -> alamat IP yang bisa dipakai NodeMCU
 *   GET /api/sensor/rooms              -> daftar ruangan + data terbaru
 *   GET /api/sensor/:room/data?page=.. -> riwayat (pagination, default 10)
 *   GET /api/sensor/:room/export       -> unduh data .txt
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ====== Konfigurasi umum ======
const LIMIT_DEFAULT = 10;
const LIMIT_MAX = 100;

// Normalisasi nama ruangan: lowercase + SEMUA tanda baca jadi underscore.
// Sengaja disamakan dengan `slugify()` di
// components/pemantauan-suhu/helper.js supaya nama ruangan yang diketik di
// sketch NodeMCU (mis. "Ruang Manajer Mutu ISO/IEC 17025", "Ruang Timbang
// (Obat)", "Ruang Instrumen IV & Ruang Timbang OT-Kos") menghasilkan slug yang
// SAMA dengan kunci master ruangan di aplikasi dan aman dipakai di URL.
//   "Ruang Manajer Mutu ISO/IEC 17025" -> "ruang_manajer_mutu_iso_iec_17025"
//   "Ruang Timbang (Obat)"             -> "ruang_timbang_obat"
const normalizeRoom = (r) =>
  String(r || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

// DIBIARKAN KOSONG: daftar ruangan murni mengikuti data yang dikirim sensor,
// jadi ruangan baru otomatis muncul begitu NodeMCU pertama kali mengirim data.
// Bila perlu memaksa ruangan tertentu selalu tampil, isi lewat env SENSOR_ROOMS,
// mis. SENSOR_ROOMS="server,ruang_rapat".
const ROOMS = String(process.env.SENSOR_ROOMS || '')
  .split(',')
  .map((r) => normalizeRoom(r))
  .filter(Boolean);

// Format Date -> "YYYY-MM-DD HH:MM:SS" lokal (hindari pergeseran zona waktu)
const pad = (n) => String(n).padStart(2, '0');
const fmtDateTime = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return (
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ` +
    `${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
  );
};

// Waktu dari perangkat (mis. "2026-09-14 20:15:00" atau "2026-09-14T20:15:00")
// Dipakai bila valid; kalau tidak, pakai waktu server.
const parseDeviceTime = (v) => {
  const s = String(v || '').trim().replace('T', ' ');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const dt = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  return Number.isNaN(dt.getTime()) ? null : fmtDateTime(dt);
};

// Angka opsional -> number atau null (biar kolom nullable tetap NULL)
const numOrNull = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// ================= INGEST — terima data dari NodeMCU =================
const handleIngest = async (req, res) => {
  // Dukung GET (query) maupun POST (query/body JSON dari sketch ESP8266)
  const q = { ...req.query, ...(req.body || {}) };
  const pick = (...keys) => {
    for (const k of keys) {
      if (q[k] !== undefined && q[k] !== '') return q[k];
    }
    return undefined;
  };
  const str = (v) => (v === undefined || v === null ? '' : String(v).trim());

  // Nama ruangan: ruangan/room eksplisit, kalau tidak ada pakai device_id
  // (sketch SHT31 mengirim "device_id" saja).
  const deviceId = str(pick('device_id', 'deviceId', 'sensor_id', 'sensorId')).slice(0, 100) || null;
  const room = normalizeRoom(pick('ruangan', 'room') || deviceId);

  // Suhu & kelembapan: terima penamaan PHP lama maupun sketch SHT31
  const suhuNum = parseFloat(pick('suhu', 'temperature', 'temp'));
  const humNum = parseFloat(pick('kelembapan', 'humidity', 'humid', 'hum'));

  if (Number.isNaN(suhuNum) || Number.isNaN(humNum) || !room) {
    // Balas JSON + tampilkan apa yang DITERIMA, supaya dari Serial Monitor
    // NodeMCU langsung kelihatan parameter mana yang kosong (dulu teks biasa).
    const terimaSuhu = pick('suhu', 'temperature', 'temp');
    const terimaHum = pick('kelembapan', 'humidity', 'humid', 'hum');
    const terimaRoom = pick('ruangan', 'room');
    return res.status(400).json({
      success: false,
      message: 'Parameter tidak lengkap / tidak valid',
      diterima: {
        suhu: terimaSuhu === undefined ? null : String(terimaSuhu),
        kelembapan: terimaHum === undefined ? null : String(terimaHum),
        ruangan: terimaRoom === undefined ? null : String(terimaRoom),
        device_id: deviceId,
      },
      butuh: 'suhu/temperature, kelembapan/humidity, dan ruangan/room/device_id',
      contoh: '/api/sensor/ingest?suhu=30.5&kelembapan=62&ruangan=e_5_1',
      cekKoneksi: '/api/sensor/ping',
    });
  }

  // Data tambahan (opsional — hanya dikirim sensor tertentu seperti SHT31)
  const dewPoint = numOrNull(pick('dew_point', 'dewPoint'));
  const heatIndex = numOrNull(pick('heat_index', 'heatIndex'));
  const tempStatus = str(pick('temperature_status', 'temperatureStatus')).slice(0, 30) || null;
  const humStatus = str(pick('humidity_status', 'humidityStatus')).slice(0, 30) || null;
  // Status alarm dari perangkat (mis. "AKTIF" bila suhu > BATAS_SUHU di sketch)
  const alarmStatus = str(pick('alarm_status', 'alarmStatus', 'alarm')).slice(0, 30) || null;

  // Waktu: pakai waktu perangkat bila valid, kalau tidak pakai waktu server
  const waktu = parseDeviceTime(
    pick('waktu', 'datetime', 'timestamp') ||
      (str(pick('reading_date')) && str(pick('reading_time'))
        ? `${str(pick('reading_date'))} ${str(pick('reading_time'))}`
        : '')
  ) || fmtDateTime(new Date());

  try {
    await pool.query(
      `INSERT INTO dht_log
         (ruangan, device_id, suhu, kelembapan, dew_point, heat_index,
          temperature_status, humidity_status, alarm_status, waktu)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         device_id = VALUES(device_id),
         suhu = VALUES(suhu),
         kelembapan = VALUES(kelembapan),
         dew_point = VALUES(dew_point),
         heat_index = VALUES(heat_index),
         temperature_status = VALUES(temperature_status),
         humidity_status = VALUES(humidity_status),
         alarm_status = VALUES(alarm_status)`,
      [room, deviceId, suhuNum, humNum, dewPoint, heatIndex, tempStatus, humStatus, alarmStatus, waktu]
    );

    res.json({
      success: true,
      message: 'Data berhasil disimpan',
      data: {
        ruangan: room,
        device_id: deviceId,
        suhu: suhuNum,
        kelembapan: humNum,
        dew_point: dewPoint,
        heat_index: heatIndex,
        temperature_status: tempStatus,
        humidity_status: humStatus,
        alarm_status: alarmStatus,
        waktu,
      },
    });
  } catch (err) {
    console.error('Ingest sensor error:', err.message);
    res.status(500).send('Gagal menyimpan data: ' + err.message);
  }
};
router.get('/ingest', handleIngest);
router.post('/ingest', handleIngest);

// ============ PING — cek koneksi TANPA mengirim data sensor ============
// Dipakai sketch NodeMCU untuk rutin "Mengecek koneksi ke backend…".
// Jangan pakai /ingest untuk cek koneksi: /ingest sengaja menolak (HTTP 400)
// bila suhu/kelembapan/ruangan tidak dikirim, supaya tidak ada data kosong
// yang tersimpan ke tabel dht_log.
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Backend sensor OK',
    port: process.env.PORT || 5003,
    waktu: fmtDateTime(new Date()),
  });
});

// ============ INFO AKSES — alamat IP yang bisa dipakai NodeMCU ============
// NodeMCU TIDAK boleh memakai "localhost" (artinya dirinya sendiri).
// Gunakan IP komputer ini, harus satu jaringan/Wi-Fi dengan NodeMCU.
router.get('/info', (req, res) => {
  const os = require('os');
  const port = process.env.PORT || 5003;
  const addresses = [];
  Object.values(os.networkInterfaces()).forEach((list) => {
    (list || []).forEach((n) => {
      if (n.family === 'IPv4' && !n.internal) addresses.push(n.address);
    });
  });

  res.json({
    success: true,
    data: {
      port,
      addresses,
      ingestPath: '/api/sensor/ingest?suhu=30.5&kelembapan=62&ruangan=nama_ruangan',
      contohUrl: addresses.map((ip) => `http://${ip}:${port}/api/sensor/ingest?suhu=30.5&kelembapan=62&ruangan=nama_ruangan`),
    },
  });
});

// Daftar ruangan = ROOMS bawaan + semua ruangan yang ada di tabel dht_log
const getRooms = async () => {
  const [rows] = await pool.query('SELECT DISTINCT ruangan FROM dht_log');
  const found = rows.map((r) => r.ruangan).filter(Boolean);
  return [...new Set([...ROOMS, ...found])].sort();
};

// ================= DAFTAR RUANGAN + DATA TERBARU =================
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await getRooms();
    // Belum ada sensor yang mengirim data -> kembalikan daftar kosong
    if (rooms.length === 0) return res.json({ success: true, data: [] });

    const placeholders = rooms.map(() => '?').join(',');
    // Ambil baris terbaru per ruangan (berdasarkan waktu terbesar) + total data
    const [rows] = await pool.query(
      `SELECT d.ruangan, d.device_id, d.suhu, d.kelembapan, d.dew_point, d.heat_index,
              d.temperature_status, d.humidity_status, d.alarm_status, d.waktu, t.total
         FROM dht_log d
         JOIN (SELECT ruangan, MAX(waktu) AS mw FROM dht_log WHERE ruangan IN (${placeholders}) GROUP BY ruangan) g
           ON d.ruangan = g.ruangan AND d.waktu = g.mw
         JOIN (SELECT ruangan, COUNT(*) AS total FROM dht_log WHERE ruangan IN (${placeholders}) GROUP BY ruangan) t
           ON t.ruangan = d.ruangan
        WHERE d.ruangan IN (${placeholders})`,
      [...rooms, ...rooms, ...rooms]
    );

    const map = {};
    rows.forEach((r) => {
      map[r.ruangan] = r;
    });

    const data = rooms.map((room) => {
      const hit = map[room];
      if (!hit) return { ruangan: room, latest: null, total: 0 };
      return {
        ruangan: room,
        latest: {
          suhu: Number(hit.suhu),
          kelembapan: Number(hit.kelembapan),
          waktu: fmtDateTime(hit.waktu),
          device_id: hit.device_id || null,
          dew_point: hit.dew_point === null ? null : Number(hit.dew_point),
          heat_index: hit.heat_index === null ? null : Number(hit.heat_index),
          temperature_status: hit.temperature_status || null,
          humidity_status: hit.humidity_status || null,
          alarm_status: hit.alarm_status || null,
        },
        total: Number(hit.total),
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /sensor/rooms error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= RIWAYAT SATU RUANGAN (pagination) =================
router.get('/:room/data', async (req, res) => {
  const room = normalizeRoom(req.params.room);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    LIMIT_MAX,
    Math.max(1, parseInt(req.query.limit, 10) || LIMIT_DEFAULT)
  );
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.query(
      `SELECT id, ruangan, device_id, suhu, kelembapan, dew_point, heat_index,
              temperature_status, humidity_status, alarm_status, waktu
         FROM dht_log
        WHERE ruangan = ?
        ORDER BY waktu DESC, id DESC
        LIMIT ? OFFSET ?`,
      [room, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM dht_log WHERE ruangan = ?',
      [room]
    );

    const cleanRows = rows.map((r) => ({
      id: r.id,
      suhu: Number(r.suhu),
      kelembapan: Number(r.kelembapan),
      waktu: fmtDateTime(r.waktu),
      device_id: r.device_id || null,
      dew_point: r.dew_point === null ? null : Number(r.dew_point),
      heat_index: r.heat_index === null ? null : Number(r.heat_index),
      temperature_status: r.temperature_status || null,
      humidity_status: r.humidity_status || null,
      alarm_status: r.alarm_status || null,
    }));

    res.json({
      success: true,
      data: {
        ruangan: room,
        rows: cleanRows,
        page,
        limit,
        total: Number(total),
        totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
      },
    });
  } catch (err) {
    console.error('GET /sensor/:room/data error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= EXPORT TXT SATU RUANGAN =================
router.get('/:room/export', async (req, res) => {
  const room = normalizeRoom(req.params.room);

  try {
    const [rows] = await pool.query(
      `SELECT device_id, suhu, kelembapan, dew_point, heat_index,
              temperature_status, humidity_status, alarm_status, waktu
         FROM dht_log WHERE ruangan = ? ORDER BY waktu DESC`,
      [room]
    );

    const now = new Date();
    let txt = `Ruangan : ${room.toUpperCase()}\n`;
    txt += `Tanggal Export : ${fmtDateTime(now)}\n\n`;

    if (!rows.length) {
      txt += 'Belum ada data.\n';
    } else {
      rows.forEach((r) => {
        txt += `${fmtDateTime(r.waktu)} | Suhu: ${Number(r.suhu)}°C | Kelembapan: ${Number(
          r.kelembapan
        )}%`;
        if (r.dew_point !== null) txt += ` | Titik Embun: ${Number(r.dew_point)}°C`;
        if (r.heat_index !== null) txt += ` | Indeks Panas: ${Number(r.heat_index)}°C`;
        if (r.temperature_status) txt += ` | Status: ${r.temperature_status}`;
        if (r.humidity_status) txt += ` / ${r.humidity_status}`;
        if (r.alarm_status) txt += ` | Alarm: ${r.alarm_status}`;
        if (r.device_id) txt += ` | Device: ${r.device_id}`;
        txt += '\n';
      });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="data_${room}.txt"`);
    res.send(txt);
  } catch (err) {
    console.error('GET /sensor/:room/export error:', err.message);
    res.status(500).send('Gagal mengekspor data: ' + err.message);
  }
});

module.exports = router;
