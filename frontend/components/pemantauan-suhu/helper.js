// components/pemantauan-suhu/helper.js
/**
 * HELPER — Modul Pemantauan Suhu & Kelembapan
 * -------------------------------------------
 * Konstanta tampilan + formatter + penilai status sensor.
 * Dipakai oleh `Container.js`. Tidak ada state / request API di sini
 * supaya file ini murni fungsi dan mudah diuji.
 */
import { axiosInstance } from '../../utils/axiosInstance';

// Base URL backend (mis. http://localhost:5003/api) — dipakai untuk link
// export .txt dan contoh URL ingest NodeMCU.
export const API_BASE = axiosInstance.defaults.baseURL;

// ======================= MASTER RUANGAN =======================
/**
 * Slug nama ruangan — HARUS sama dengan `normalizeRoom()` di
 * backend/routes/sensor.js supaya kode ruang bisa dipakai sebagai
 * nama ruangan yang dikirim NodeMCU.
 *   "E-5.1"      -> "e_5_1"
 *   "Ruang Staf" -> "ruang_staf"
 */
export const slugify = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

// Palet aksen tiap laboratorium (mengikuti tema cyan/glassmorphism aplikasi)
const ACCENT = {
  cyan: {
    grad: 'from-cyan-400 to-sky-600',
    glow: 'shadow-cyan-500/30',
    text: 'text-cyan-600 dark:text-cyan-300',
    soft: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    border: 'hover:border-cyan-400/50 dark:hover:border-cyan-400/30',
    ring: 'ring-cyan-400/60',
    active: 'border-cyan-400/60 bg-cyan-500/10',
  },
  sky: {
    grad: 'from-sky-400 to-indigo-600',
    glow: 'shadow-sky-500/30',
    text: 'text-sky-600 dark:text-sky-300',
    soft: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    border: 'hover:border-sky-400/50 dark:hover:border-sky-400/30',
    ring: 'ring-sky-400/60',
    active: 'border-sky-400/60 bg-sky-500/10',
  },
  indigo: {
    grad: 'from-indigo-400 to-violet-600',
    glow: 'shadow-indigo-500/30',
    text: 'text-indigo-600 dark:text-indigo-300',
    soft: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    border: 'hover:border-indigo-400/50 dark:hover:border-indigo-400/30',
    ring: 'ring-indigo-400/60',
    active: 'border-indigo-400/60 bg-indigo-500/10',
  },
};

/**
 * Daftar ruangan per laboratorium (kode ruang + nama ruang).
 * `key` = slug yang dipakai untuk mencocokkan data sensor
 * (NodeMCU mengirim `ruangan=<key>`, mis. `ruangan=e_5_1`).
 */
const room = (kode, nama) => ({ kode: kode || null, nama, key: slugify(kode || nama) });

export const LABS = [
  {
    kode: 'E',
    nama: 'Lab Kimia',
    komoditi: 'Obat, NAPPZA, Kosmetik, Obat Tradisional dan Suplemen Kesehatan',
    accent: ACCENT.cyan,
    rooms: [
      room(null, 'Ruang Manajer Mutu ISO/IEC 17025'),
      room(null, 'Ruang Manajer Teknis Sediaan Farmasi'),
      room(null, 'Ruang Manajer Teknis Pangan Olahan'),
      room('E-2', 'Ruang Staf'),
      room('E-4', 'Ruang Arsip'),
      room('E-5.1', 'Ruang Instrumen I'),
      room('E-5.2', 'Ruang Instrumen II'),
      room('E-6', 'Ruang Timbang (Obat)'),
      room('E-7.1', 'Ruang Preparasi I dan Ruang AAS OT-Kos'),
      room('E-7.2', 'Ruang Preparasi II (Obat)'),
      room('E-8.2', 'Ruang Instrumen IV & Ruang Timbang OT-Kos'),
      room('E-9', 'Ruang Preparasi III Kos'),
      room('E-10.1', 'Ruang Preparasi IV OT'),
      room('E-11.2', 'Ruang Instrumen III'),
      room(null, 'Ruang Timbang Mikro'),
      room(null, 'Ruang Penyimpanan Baku Pembanding, Sampel dan Suku Cadang'),
    ],
  },
  {
    kode: 'D',
    nama: 'Lab Kimia',
    komoditi: 'Pangan dan Bahan Berbahaya',
    accent: ACCENT.sky,
    rooms: [
      room('D-2', 'Ruang Staf'),
      room('D-3', 'Ruang Pantry/Dapur'),
      room('D-4', 'Ruang Preparasi I'),
      room('D-5', 'Ruang Arsip Sampel'),
      room('D-6', 'Ruang Instrumen I'),
      room('D-7', 'Ruang Preparasi II'),
      room('D-8', 'Ruang Lemari Asam I'),
      room('D-9', 'Ruang Preparasi III'),
      room('D-10', 'Ruang Antara'),
      room('D-11', 'Ruang Timbang'),
      room('D-12', 'Ruang Instrumen II'),
      room('D-13', 'Ruang Lemari Asam II'),
      room('D-14', 'Ruang AAS'),
      room('D-15', 'Ruang Instrumen III'),
    ],
  },
  {
    kode: 'F',
    nama: 'Lab Mikrobiologi',
    komoditi: null,
    accent: ACCENT.indigo,
    rooms: [
      room('F.1', 'Ruang Arsip Mikrobiologi'),
      room('F.2', 'Ruang Staf'),
      room('F.4', 'Ruang Penyimpanan Sampel'),
      room('F.5', 'Ruang Media'),
      room('F.5.1', 'Ruang Sterilisasi'),
      room('F.5.2', 'Ruang Destruksi'),
      room('F.6', 'Ruang Inkubasi'),
      room('F.7', 'Ruang Potensi'),
      room('F.8', 'Ruang Antara'),
      room('F.8.1', 'Ruang Uji Cemaran'),
      room('F.8.2', 'Ruang Inokulasi'),
      room('F.9', 'Ruang Uji Jamur'),
      room(null, 'Ruang Mastermix (DNA 1)'),
      room(null, 'Ruang PCR (DNA 2)'),
      room(null, 'Ruang Ekstraksi (DNA 3)'),
    ],
  },
];

// ---------- Indeks pencocokan ruangan <-> data sensor ----------
/**
 * `room.key` adalah **ID PERANGKAT** yang harus dikirim NodeMCU
 * (`ruangan=<key>`). Untuk ruangan berkode, ID = slug kode ruang sehingga
 * SELALU unik antar lab, mis.
 *   "Ruang Staf"          -> E-2 (e_2)  | D-2 (d_2)   | F.2 (f_2)
 *   "Ruang Instrumen I"   -> E-5.1 (e_5_1) | D-6 (d_6)
 *   "Ruang Antara"        -> D-10 (d_10)  | F.8 (f_8)
 * Ruangan tanpa kode memakai slug nama ruang (nama-nama itu unik).
 */
export const ROOM_BY_ID = new Map();
// Nama ruangan -> daftar ruangan yang memakainya (bisa > 1 lab)
export const ROOM_BY_NAME = new Map();

LABS.forEach((lab) => {
  lab.rooms.forEach((r) => {
    ROOM_BY_ID.set(r.key, { lab, room: r });
    const namaKey = slugify(r.nama);
    if (!ROOM_BY_NAME.has(namaKey)) ROOM_BY_NAME.set(namaKey, []);
    ROOM_BY_NAME.get(namaKey).push({ lab, room: r });
  });
});

// Nama ruangan yang dipakai lebih dari satu lab (mis. "Ruang Staf")
export const DUPLICATE_NAMES = [...ROOM_BY_NAME.entries()]
  .filter(([, list]) => list.length > 1)
  .map(([key, list]) => ({ key, nama: list[0].room.nama, entries: list }));

// Nama ruangan ini unik? Kalau TIDAK unik, perangkat wajib memakai kode ruang.
export const isNameUnique = (roomItem) =>
  (ROOM_BY_NAME.get(slugify(roomItem.nama)) || []).length <= 1;

/**
 * Cocokkan nama ruangan yang dikirim sensor dengan ruangan master.
 *   { lab, room }        -> cocok lewat ID perangkat, atau lewat nama yang unik
 *   { ambiguous: [...] } -> namanya dipakai beberapa lab, tidak bisa dipastikan
 *   null                 -> tidak ada di master ruangan
 */
export const resolveRoom = (ruangan) => {
  const s = slugify(ruangan);
  if (!s) return null;

  const byId = ROOM_BY_ID.get(s);
  if (byId) return { ...byId, via: 'id' };

  const byName = ROOM_BY_NAME.get(s) || [];
  if (byName.length === 1) return { ...byName[0], via: 'nama' };
  if (byName.length > 1) return { ambiguous: byName, via: 'nama' };
  return null;
};

// Cocokkan satu ruangan master dengan data sensor (peta slug -> data sensor).
// Pencarian lewat NAMA hanya dipakai bila nama itu unik, supaya satu sensor
// tidak menempel ke beberapa kartu sekaligus (mis. "Ruang Staf" E/D/F).
export const lookupSensor = (roomItem, sensorMap) => {
  const byId = sensorMap[roomItem.key];
  if (byId) return byId;
  if (!isNameUnique(roomItem)) return null;
  return sensorMap[slugify(roomItem.nama)] || null;
};

// Daftar ID perangkat satu lab (untuk panduan pemasangan sensor)
export const deviceIdsOf = (lab) =>
  lab.rooms.map((r) => ({ kode: r.kode, nama: r.nama, id: r.key, unik: isNameUnique(r) }));

// Total ruangan seluruh lab
export const TOTAL_ROOMS = LABS.reduce((n, l) => n + l.rooms.length, 0);

// Ambang "online": toleransi terhadap jeda kirim NodeMCU (sesuaikan bila
// interval kirim sensor berubah). Default 6 jam.
const ONLINE_MS = 6 * 60 * 60 * 1000;

export const displayName = (r) =>
  String(r || '')
    .split(/[_-]+/)
    .map((w) => {
      if (!w) return w;
      // Token yang memuat angka (mis. "sht31") ditulis kapital semua
      return /\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');

export const num = (v, digits = 1) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(digits);

// Kelas warna chip berdasarkan suhu (dipakai sebagai fallback)
const tempClass = (t) => {
  if (!Number.isFinite(t)) return 'bg-slate-500/10 text-slate-500 dark:text-slate-400';
  if (t >= 30) return 'bg-red-500/10 text-red-600 dark:text-red-300';
  if (t >= 27) return 'bg-amber-500/10 text-amber-600 dark:text-amber-300';
  if (t >= 23) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
  if (t >= 18) return 'bg-sky-500/10 text-sky-600 dark:text-sky-300';
  return 'bg-blue-500/10 text-blue-600 dark:text-blue-300';
};

// Warna chip mengikuti LABEL status dari perangkat bila ada — karena ambang
// batas tiap ruangan berbeda (mis. sketch dengan BATAS_SUHU 35 °C menyebut 32 °C
// "NORMAL"), jadi suhu saja tidak bisa dipakai menghakimi.
const statusClass = (label, suhu) => {
  const s = String(label || '').toUpperCase();
  if (/SANGAT PANAS|PANAS|TINGGI|ALARM|AKTIF|OVER|MELEBIHI/.test(s)) {
    return 'bg-red-500/10 text-red-600 dark:text-red-300';
  }
  if (/HANGAT|LEMBAP/.test(s)) return 'bg-amber-500/10 text-amber-600 dark:text-amber-300';
  if (/NYAMAN|NORMAL|AMAN|BAIK|OK/.test(s)) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
  }
  if (/SANGAT DINGIN|DINGIN|RENDAH/.test(s)) return 'bg-sky-500/10 text-sky-600 dark:text-sky-300';
  return tempClass(suhu);
};

// Prioritas: status dari perangkat (sketch SHT31) -> fallback hitung dari suhu
export const statusInfo = (latest) => {
  if (!latest) return { label: 'Belum Ada Data', cls: 'bg-slate-500/10 text-slate-500 dark:text-slate-400' };
  const t = Number(latest.suhu);
  const dariPerangkat = String(latest.temperature_status || '').trim();
  if (dariPerangkat) return { label: dariPerangkat, cls: statusClass(dariPerangkat, t) };
  if (t >= 35) return { label: 'Panas', cls: tempClass(t) };
  if (t <= 18) return { label: 'Dingin', cls: tempClass(t) };
  return { label: 'Normal', cls: tempClass(t) };
};

// ===== STATUS ALARM =====
// Sumber utama: `alarm_status` dari perangkat (sketch mengirim "AKTIF" bila suhu
// melewati BATAS_SUHU-nya, "NORMAL" bila masih dalam batas).
const ALARM_ON = ['AKTIF', 'ALARM', 'ON', 'YA', 'YES', 'TRUE', '1', 'TINGGI', 'PANAS', 'SANGAT PANAS'];
const ALARM_OFF = ['NORMAL', 'AMAN', 'OFF', 'TIDAK', 'NO', 'FALSE', '0', 'OK'];

/**
 * Tentukan status alarm dari satu data sensor (dipakai untuk data terbaru
 * MAUPUN satu baris riwayat).
 *
 * Bila perangkat TIDAK mengirim `alarm_status`, dipakai perkiraan dari
 * `temperature_status` — hanya label yang jelas di atas batas (PANAS / TINGGI)
 * yang dianggap alarm, sedangkan label seperti "HANGAT" dibiarkan normal agar
 * tidak memicu alarm palsu pada ruangan dengan batas suhu berbeda.
 *
 * Tiap lab boleh punya batas berbeda, jadi yang menentukan tetap perangkat.
 *
 * @returns {null|{on:boolean, sumber:'perangkat'|'perkiraan', teks:string}}
 */
export const alarmInfo = (data) => {
  if (!data) return null;

  const raw = String(data.alarm_status || '').trim().toUpperCase();
  if (raw) {
    // Nilai yang tidak dikenali sengaja dianggap AKTIF (lebih aman untuk log suhu)
    return { on: !ALARM_OFF.includes(raw), sumber: 'perangkat', teks: raw };
  }

  const status = String(data.temperature_status || '').trim().toUpperCase();
  if (status && ALARM_ON.includes(status)) {
    return { on: true, sumber: 'perkiraan', teks: status };
  }
  return { on: false, sumber: 'perkiraan', teks: status };
};

export const isOnline = (waktu) => {
  if (!waktu) return false;
  const diff = Date.now() - new Date(waktu).getTime();
  return Number.isFinite(diff) && diff < ONLINE_MS;
};

export const timeAgo = (waktu) => {
  if (!waktu) return '—';
  const diff = Date.now() - new Date(waktu).getTime();
  if (!Number.isFinite(diff)) return '—';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return new Date(waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};
