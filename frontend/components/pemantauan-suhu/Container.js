// components/pemantauan-suhu/Container.js
/**
 * MODUL: PEMANTAUAN SUHU & KELEMBAPAN — Container
 * ------------------------------------------------
 * Konversi dari versi PHP (load_data.php / dht_post.php / export_txt.php)
 * ke JavaScript (Next.js + Express).
 *
 * ==== KONVENSI STRUKTUR APLIKASI (ikuti saat membuat modul baru) ====
 *   pages/<modul>/index.js           -> halaman TIPIS: <Head> + <DashboardLayout> + container
 *   components/<modul>/Container.js  -> seluruh logika & tampilan modul (file ini)
 *   components/<modul>/helper.js     -> konstanta & formatter (tanpa state/request API)
 *   components/<modul>/Modal.js      -> dialog modul, bila ada (mis. form input)
 *   components/DashboardLayout.js    -> layout global sidebar/topbar (BUKAN milik modul)
 * ===================================================================
 *
 * TAMPILAN: dibagi 3 tab laboratorium mengikuti master ruangan di helper.js
 *   E = Lab Kimia (Obat, NAPPZA, Kosmetik, OT & Suplemen Kesehatan)
 *   D = Lab Kimia (Pangan dan Bahan Berbahaya)
 *   F = Lab Mikrobiologi
 * SEMUA ruangan master selalu tampil. Ruangan yang sensornya belum terpasang
 * ditandai "Belum ada sensor" + kode yang harus dikirim NodeMCU, sehingga
 * penambahan sensor berikutnya tinggal mengikuti kode ruangnya.
 *
 * Data dibaca dari backend: GET /api/sensor/* (database pengujian, tabel dht_log).
 * Auto-refresh data terbaru tiap 10 detik; riwayat aktif tiap 15 detik.
 *
 * ID RUANGAN (anti-bentrok antar lab): tiap ruangan punya ID perangkat
 * (`room.key`) = slug KODE RUANG (mis. E-5.1 -> `e_5_1`, D-6 -> `d_6`) sehingga
 * 45 ID-nya unik. NodeMCU sebaiknya mengirim ID ini sebagai `ruangan`/`device_id`.
 * Kalau perangkat mengirim NAMA ruangan, aplikasi hanya mencocokkannya bila nama
 * itu unik; nama yang dipakai beberapa lab (mis. "Ruang Staf" di E-2, D-2, F.2,
 * "Ruang Instrumen I" di E-5.1, D-6) sengaja TIDAK ditempelkan ke kartu mana pun
 * supaya satu sensor tidak muncul di beberapa kartu — sensor seperti itu
 * ditampilkan di bagian "Ruangan sensor yang belum bisa ditempatkan" beserta ID
 * yang seharusnya dipakai. Daftar ID perangkat per lab ada di panduan pemasangan.
 *
 * RIWAYAT: dibuka sebagai DIALOG (`Modal.js` -> RiwayatModal) berisi ringkasan
 * pembacaan terbaru + tabel riwayat dalam satu tampilan, supaya info suhu dan
 * riwayatnya tidak berjauhan seperti pada section panjang di bawah halaman.
 * State & request API tetap di file ini; `Modal.js` hanya tampilan.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { axiosInstance } from '../../utils/axiosInstance';
import {
  FaThermometerHalf,
  FaDownload,
  FaHistory,
  FaExclamationTriangle,
  FaBell,
  FaSearch,
  FaFlask,
  FaMicroscope,
  FaCheckCircle,
  FaInfoCircle,
  FaPlug,
} from 'react-icons/fa';
import {
  API_BASE,
  LABS,
  TOTAL_ROOMS,
  slugify,
  resolveRoom,
  lookupSensor,
  isNameUnique,
  deviceIdsOf,
  displayName,
  num,
  statusInfo,
  alarmInfo,
  isOnline,
  timeAgo,
} from './helper';
import RiwayatModal from './Modal';

// Ikon & opsi filter — ikon per laboratorium
const LAB_ICON = { E: FaFlask, D: FaFlask, F: FaMicroscope };

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'sensor', label: 'Bersensor' },
  { id: 'online', label: 'Online' },
  { id: 'offline', label: 'Offline' },
  { id: 'empty', label: 'Belum ada sensor' },
];

export default function PemantauanSuhuContainer() {
  const { status } = useSession();
  const authenticated = status === 'authenticated';

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sensorInfo, setSensorInfo] = useState(null); // alamat IP yang bisa diakses NodeMCU
  const [activeLab, setActiveLab] = useState(LABS[0].kode); // tab laboratorium aktif
  const [query, setQuery] = useState(''); // pencarian kode / nama ruang
  const [filter, setFilter] = useState('all'); // filter status kartu ruangan
  const [showGuide, setShowGuide] = useState(false); // panduan ingest NodeMCU
  const [active, setActive] = useState(null); // ruangan yang riwayatnya terbuka
  const [hist, setHist] = useState(null); // data riwayat ruangan aktif
  const [histLoading, setHistLoading] = useState(false);

  const loadRooms = async () => {
    try {
      const res = await axiosInstance.get('/sensor/rooms');
      if (res.data && res.data.success) setRooms(res.data.data);
      setError('');
    } catch (err) {
      setError('Gagal memuat data sensor. Pastikan backend berjalan di port 5003.');
    } finally {
      setRoomsLoading(false);
    }
  };

  const loadHistory = async (room, page = 1) => {
    setHistLoading(true);
    try {
      const res = await axiosInstance.get(`/sensor/${encodeURIComponent(room)}/data`, {
        params: { page },
      });
      if (res.data && res.data.success) setHist(res.data.data);
      setError('');
    } catch (err) {
      setError('Gagal memuat riwayat ruangan.');
    } finally {
      setHistLoading(false);
    }
  };

  // Muat daftar ruangan + data terbaru, auto-refresh 10 detik
  useEffect(() => {
    if (!authenticated) return;
    loadRooms();
    const id = setInterval(loadRooms, 10000);
    return () => clearInterval(id);
  }, [authenticated]);

  // Muat alamat IP LAN backend (untuk konfigurasi NodeMCU) — sekali saja
  useEffect(() => {
    if (!authenticated) return;
    axiosInstance
      .get('/sensor/info')
      .then((res) => {
        if (res.data && res.data.success) setSensorInfo(res.data.data);
      })
      .catch(() => setSensorInfo(null));
  }, [authenticated]);

  // Auto-refresh riwayat ruangan aktif 15 detik
  useEffect(() => {
    if (!authenticated || !active) return;
    const id = setInterval(() => {
      loadHistory(active, hist?.page || 1);
    }, 15000);
    return () => clearInterval(id);
  }, [authenticated, active, hist?.page]);

  const toggleRoom = (room) => {
    if (active === room) {
      setActive(null);
      setHist(null);
      return;
    }
    setActive(room);
    loadHistory(room, 1);
  };

  const exportTxt = (room) => {
    window.open(`${API_BASE}/sensor/${encodeURIComponent(room)}/export`, '_blank');
  };

  const changePage = (step) => {
    if (!active || !hist) return;
    const next = Math.min(hist.totalPages, Math.max(1, hist.page + step));
    if (next === hist.page) return;
    loadHistory(active, next);
  };

  // ===== Data turunan =====

  // Peta slug ruangan sensor -> { ruangan, latest, total }
  const sensorMap = useMemo(() => {
    const map = {};
    rooms.forEach((r) => {
      map[slugify(r.ruangan)] = r;
    });
    return map;
  }, [rooms]);

  // Statistik tiap lab (dipakai di tab & ringkasan)
  const labStats = useMemo(() => {
    const out = {};
    LABS.forEach((l) => {
      const stat = { total: l.rooms.length, sensor: 0, online: 0, offline: 0, alarm: 0, empty: 0 };
      l.rooms.forEach((r) => {
        const latest = lookupSensor(r, sensorMap)?.latest;
        if (!latest) {
          stat.empty += 1;
          return;
        }
        stat.sensor += 1;
        if (isOnline(latest.waktu)) stat.online += 1;
        else stat.offline += 1;
        if (alarmInfo(latest)?.on) stat.alarm += 1;
      });
      out[l.kode] = stat;
    });
    return out;
  }, [sensorMap]);

  // Ruangan yang dikirim sensor tapi belum bisa ditempatkan ke kartu master:
  //   'ambigu'  -> nama ruangan dipakai beberapa lab (mis. "Ruang Staf")
  //   'unknown' -> namanya tidak ada di master ruangan
  const unmatchedRooms = useMemo(
    () =>
      rooms
        .map((r) => {
          const res = resolveRoom(r.ruangan);
          if (res && res.room) return null;
          return {
            ...r,
            kind: res && res.ambiguous ? 'ambigu' : 'unknown',
            kandidat: (res && res.ambiguous) || [],
          };
        })
        .filter(Boolean),
    [rooms]
  );
  const ambiguousCount = unmatchedRooms.filter((r) => r.kind === 'ambigu').length;

  // Ruangan yang status alarmnya AKTIF (untuk banner peringatan di atas)
  const alarmRooms = useMemo(
    () =>
      LABS.flatMap((l) =>
        l.rooms
          .map((r) => {
            const sensor = lookupSensor(r, sensorMap);
            const alarm = alarmInfo(sensor?.latest);
            if (!sensor?.latest || !alarm || !alarm.on) return null;
            return { lab: l, room: r, sensor, latest: sensor.latest, alarm };
          })
          .filter(Boolean)
      ),
    [sensorMap]
  );

  const lab = LABS.find((l) => l.kode === activeLab) || LABS[0];
  const LabIcon = LAB_ICON[lab.kode] || FaFlask;
  const stats = labStats[lab.kode];
  const sensorCount = Object.values(labStats).reduce((n, s) => n + s.sensor, 0);

  // Filter + pencarian pada daftar ruangan lab aktif
  const visibleRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lab.rooms.filter((r) => {
      const latest = lookupSensor(r, sensorMap)?.latest;
      const online = latest ? isOnline(latest.waktu) : false;
      if (filter === 'sensor' && !latest) return false;
      if (filter === 'online' && !online) return false;
      if (filter === 'offline' && (!latest || online)) return false;
      if (filter === 'empty' && latest) return false;
      if (q && !`${r.kode || ''} ${r.nama}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lab, sensorMap, query, filter]);

  const filterCounts = {
    all: stats.total,
    sensor: stats.sensor,
    online: stats.online,
    offline: stats.offline,
    empty: stats.empty,
  };

  const selectLab = (kode) => {
    if (kode === activeLab) return;
    setActiveLab(kode);
    setActive(null);
    setHist(null);
    setQuery('');
    setFilter('all');
  };

  // Ruangan yang riwayatnya sedang dibuka (data untuk dialog riwayat)
  const activeInfo = useMemo(() => {
    if (!active) return null;
    const hit = resolveRoom(active);
    return {
      kode: hit?.room?.kode || null,
      nama: hit?.room?.nama || displayName(active),
      labKode: hit?.lab?.kode || null,
      accent: (hit?.lab || lab).accent,
      latest: sensorMap[slugify(active)]?.latest || null,
    };
  }, [active, sensorMap, lab]);

  // Contoh kode ruang (untuk panduan ingest) = kode ruang pertama lab aktif
  const exampleKey = (lab.rooms.find((r) => r.kode) || lab.rooms[0]).key;
  const ingestExample = `${API_BASE}/sensor/ingest?suhu=30.5&kelembapan=62&ruangan=${exampleKey}`;

  return (
    <>
        <div className="mx-auto max-w-7xl space-y-6">
          {/* ===== Keterangan halaman ===== */}
          <section className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
                <FaThermometerHalf className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Monitor Suhu & Kelembapan Ruangan
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Data dikirim sensor NodeMCU (DHT / SHT31) ke database{' '}
                  <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs text-cyan-700 dark:bg-white/10 dark:text-cyan-300">
                    pengujian
                  </code>
                  , dipisah per laboratorium & diperbarui otomatis tiap 10 detik.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="glass-chip">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Auto-refresh
              </span>
              <span className="glass-chip text-slate-400 dark:text-slate-500">
                {TOTAL_ROOMS} ruangan
              </span>
              <span className="glass-chip text-slate-400 dark:text-slate-500">
                {sensorCount} sensor aktif
              </span>
            </div>
          </section>

          {/* ===== Peringatan ALARM ===== */}
          {alarmRooms.length > 0 && (
            <section className="glass-card border-rose-300/80 bg-rose-50/70 p-4 dark:border-rose-500/30 dark:bg-rose-500/10 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30">
                  <FaBell className="h-4 w-4 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    {alarmRooms.length} ruangan dalam kondisi ALARM
                  </h3>
                  <p className="mt-0.5 text-[11px] text-rose-600/80 dark:text-rose-300/80">
                    Suhu melewati batas yang ditetapkan pada perangkat. Klik untuk melihat riwayat
                    ruangan.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {alarmRooms.map((a) => {
                      const sensor = a.sensor;
                      return (
                        <button
                          key={a.room.key}
                          type="button"
                          title={a.room.nama}
                          onClick={() => {
                            setActiveLab(a.lab.kode);
                            setQuery('');
                            setFilter('all');
                            setActive(sensor.ruangan);
                            loadHistory(sensor.ruangan, 1);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/70 bg-white/70 px-2 py-1 text-[10px] font-semibold text-rose-700 transition-colors hover:bg-white dark:border-rose-500/30 dark:bg-white/5 dark:text-rose-300 dark:hover:bg-white/10"
                        >
                          <span className="font-mono">
                            {a.lab.kode} · {a.room.kode || 'tanpa kode'}
                          </span>
                          <span className="font-mono">{num(a.latest.suhu)}°C</span>
                          {a.alarm.sumber === 'perkiraan' && (
                            <span className="text-[9px] font-normal opacity-70">(perkiraan)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ===== Error ===== */}
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <FaExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ===== Tab 3 laboratorium ===== */}
          <section className="grid gap-3 sm:grid-cols-3">
            {LABS.map((l) => {
              const Icon = LAB_ICON[l.kode] || FaFlask;
              const s = labStats[l.kode];
              const isActive = l.kode === activeLab;
              return (
                <button
                  key={l.kode}
                  type="button"
                  onClick={() => selectLab(l.kode)}
                  className={`glass-card relative overflow-hidden p-4 text-left transition-all duration-300 ${
                    l.accent.border
                  } ${
                    isActive
                      ? `ring-2 ${l.accent.ring} ${l.accent.active}`
                      : 'hover:-translate-y-0.5'
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${l.accent.grad} opacity-15 blur-2xl`}
                  />
                  <div className="relative flex items-start justify-between gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${l.accent.grad} text-white shadow-lg ${l.accent.glow}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      {s.alarm > 0 && (
                        <span
                          className="h-2 w-2 animate-pulse rounded-full bg-rose-500"
                          title={`${s.alarm} ruangan alarm`}
                        />
                      )}
                      {s.offline > 0 && (
                        <span
                          className="h-2 w-2 rounded-full bg-red-500"
                          title={`${s.offline} sensor offline`}
                        />
                      )}
                      <span
                        className={`rounded-lg px-2 py-0.5 font-mono text-[11px] font-bold ${
                          isActive
                            ? 'bg-white/70 text-slate-700 dark:bg-white/10 dark:text-white'
                            : l.accent.soft
                        }`}
                      >
                        KODE {l.kode}
                      </span>
                      {isActive && <FaCheckCircle className={`h-3.5 w-3.5 ${l.accent.text}`} />}
                    </div>
                  </div>
                  <p className="relative mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                    {l.nama}
                  </p>
                  <p className="relative mt-0.5 text-[11px] italic leading-snug text-slate-500 dark:text-slate-400">
                    {l.komoditi ? l.komoditi : 'Mikrobiologi & Molekuler'}
                  </p>
                  <div className="relative mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">{s.total} ruangan</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{s.online} online</span>
                    {s.alarm > 0 && (
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {s.alarm} alarm
                      </span>
                    )}
                    {s.offline > 0 && (
                      <span className="text-red-600 dark:text-red-400">{s.offline} offline</span>
                    )}
                    <span className="text-slate-400 dark:text-slate-500">
                      {s.empty} belum bersensor
                    </span>
                  </div>
                </button>
              );
            })}
          </section>

          {/* ===== Identitas lab aktif + ringkasan ===== */}
          <section className="glass-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${lab.accent.grad} text-white shadow-lg ${lab.accent.glow}`}
              >
                <LabIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                  {lab.nama}
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${lab.accent.soft}`}
                  >
                    KODE {lab.kode}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lab.komoditi ? `Komoditi: ${lab.komoditi}` : 'Ruang lingkup: Mikrobiologi & Molekuler'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Bersensor', value: stats.sensor, tone: 'text-slate-700 dark:text-slate-200' },
                { label: 'Online', value: stats.online, tone: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Offline', value: stats.offline, tone: 'text-red-600 dark:text-red-400' },
                { label: 'Alarm', value: stats.alarm, tone: 'text-rose-600 dark:text-rose-400' },
                { label: 'Tanpa sensor', value: stats.empty, tone: 'text-slate-400 dark:text-slate-500' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="min-w-[86px] rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-center dark:border-white/10 dark:bg-white/5"
                >
                  <p className={`text-lg font-extrabold leading-none ${s.tone}`}>{s.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ===== Pencarian + filter ===== */}
          <section className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kode atau nama ruang…"
                className="w-full rounded-xl border border-white/60 bg-white/60 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => {
                const on = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      on
                        ? 'border-transparent bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/25'
                        : 'border-white/60 bg-white/50 text-slate-600 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                    <span className={on ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}>
                      {filterCounts[f.id]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ===== Kartu ruangan ===== */}
          {roomsLoading && rooms.length === 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="glass-card h-52 animate-pulse p-5" />
              ))}
            </div>
          ) : visibleRooms.length === 0 ? (
            <section className="glass-card flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
                <FaSearch className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Tidak ada ruangan yang cocok
              </h3>
              <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                Ubah kata kunci pencarian atau pilih filter lain pada lab {lab.nama} (kode {lab.kode}).
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
                className="text-xs font-semibold text-cyan-600 hover:underline dark:text-cyan-300"
              >
                Reset pencarian & filter
              </button>
            </section>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleRooms.map((room) => {
                const sensor = lookupSensor(room, sensorMap);
                const latest = sensor?.latest;
                const st = statusInfo(latest);
                const alarm = alarmInfo(latest);
                const online = latest ? isOnline(latest.waktu) : false;
                const open = Boolean(sensor) && active === sensor.ruangan;
                const hasSensor = Boolean(latest);

                return (
                  <div
                    key={room.key}
                    className={`glass-card-hover relative flex flex-col overflow-hidden p-5 transition-all ${
                      alarm?.on
                        ? 'border-rose-300/80 ring-2 ring-rose-400/60 dark:border-rose-500/40'
                        : open
                        ? `ring-2 ${lab.accent.ring}`
                        : ''
                    } ${hasSensor ? '' : 'opacity-90'}`}
                  >
                    {/* Dekorasi */}
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-gradient-to-br ${
                        hasSensor ? lab.accent.grad : 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'
                      } opacity-15 blur-2xl`}
                    />

                    {/* Header */}
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${
                            hasSensor
                              ? `bg-gradient-to-br ${lab.accent.grad} ${lab.accent.glow}`
                              : 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-400/20 dark:from-slate-600 dark:to-slate-700'
                          }`}
                        >
                          {hasSensor ? <FaThermometerHalf className="h-5 w-5" /> : <FaPlug className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide ${
                              room.kode
                                ? lab.accent.soft
                                : 'bg-slate-500/10 text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {room.kode || 'TANPA KODE'}
                          </span>
                          <p
                            className="mt-1 text-sm font-semibold leading-snug text-slate-900 dark:text-white"
                            title={room.nama}
                          >
                            {room.nama}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                latest ? (online ? 'bg-emerald-500' : 'bg-red-500') : 'bg-slate-400'
                              }`}
                            />
                            {latest ? (online ? 'Online' : 'Offline') : 'Belum ada sensor'}
                          </p>
                        </div>
                      </div>
                      {hasSensor && (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {alarm?.on && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                              <FaBell className="h-3 w-3 animate-pulse" />
                              ALARM
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}
                          >
                            {st.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Isi: data sensor atau placeholder */}
                    {hasSensor ? (
                      <>
                        <div className="relative mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              Suhu
                            </p>
                            <p className={`mt-0.5 text-3xl font-extrabold ${lab.accent.text}`}>
                              {num(latest?.suhu)}
                              <span className="text-base font-semibold">°C</span>
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              Kelembapan
                            </p>
                            <p className="mt-0.5 text-3xl font-extrabold text-slate-700 dark:text-slate-200">
                              {num(latest?.kelembapan)}
                              <span className="text-base font-semibold">%</span>
                            </p>
                          </div>
                        </div>

                        {/* Nilai tambahan dari sensor SHT31 (kalau ada) */}
                        {(latest?.dew_point !== null && latest?.dew_point !== undefined) ||
                        (latest?.heat_index !== null && latest?.heat_index !== undefined) ? (
                          <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {latest?.dew_point !== null && latest?.dew_point !== undefined && (
                              <span>
                                Titik Embun{' '}
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  {num(latest.dew_point)}°C
                                </span>
                              </span>
                            )}
                            {latest?.heat_index !== null && latest?.heat_index !== undefined && (
                              <span>
                                Indeks Panas{' '}
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  {num(latest.heat_index)}°C
                                </span>
                              </span>
                            )}
                            {latest?.humidity_status && <span>RH: {latest.humidity_status}</span>}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="relative mt-5 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300/80 bg-white/30 px-4 py-6 text-center dark:border-white/15 dark:bg-white/5">
                        <FaPlug className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Belum ada sensor terpasang
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Kirim data dengan nama ruangan:
                        </p>
                        <code className="rounded-lg bg-white/70 px-2 py-1 font-mono text-[10px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          ruangan={room.key}
                        </code>
                        {!isNameUnique(room) && (
                          <p className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            Nama ini juga dipakai di lab lain — wajib pakai kode ruang
                          </p>
                        )}
                      </div>
                    )}

                    {/* Footer: info + aksi */}
                    <div className="relative mt-4 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {hasSensor
                          ? `Update ${timeAgo(latest.waktu)} · ${sensor.total} data${
                              latest?.device_id ? ` · ${latest.device_id}` : ''
                            }`
                          : 'Menunggu data NodeMCU'}
                      </p>
                      {hasSensor && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleRoom(sensor.ruangan)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              open
                                ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/25'
                                : 'border border-white/60 bg-white/50 text-slate-600 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                            }`}
                          >
                            <FaHistory className="h-3 w-3" />
                            {open ? 'Tutup' : 'Riwayat'}
                          </button>
                          <button
                            type="button"
                            onClick={() => exportTxt(sensor.ruangan)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                            title="Unduh data sebagai .txt"
                          >
                            <FaDownload className="h-3 w-3" />
                            Export
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== Ruangan sensor yang belum bisa ditempatkan ===== */}
          {unmatchedRooms.length > 0 && (
            <section className="glass-card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-white/50 bg-white/40 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25">
                  <FaInfoCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Ruangan sensor yang belum bisa ditempatkan
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {unmatchedRooms.length} ruangan
                    {ambiguousCount > 0 ? ` · ${ambiguousCount} nama bentrok antar lab` : ''} — belum
                    muncul di kartu master. Perbaiki nama ruangan pada sketch NodeMCU memakai ID
                    perangkat pada daftar di panduan bawah.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {unmatchedRooms.map((r) => {
                  const st = statusInfo(r.latest);
                  const online = isOnline(r.latest?.waktu);
                  return (
                    <div
                      key={r.ruangan}
                      className={`rounded-2xl border p-4 dark:bg-white/5 ${
                        r.kind === 'ambigu'
                          ? 'border-amber-300/80 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10'
                          : 'border-white/60 bg-white/50 dark:border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {displayName(r.ruangan)}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        ruangan={r.ruangan}
                      </p>

                      {r.kind === 'ambigu' ? (
                        <div className="mt-2 rounded-xl bg-white/70 p-2 dark:bg-white/5">
                          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            Nama ini dipakai di {r.kandidat.length} lab — tidak bisa dipastikan
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {r.kandidat.map((k) => (
                              <li
                                key={k.room.key}
                                className="font-mono text-[10px] text-slate-600 dark:text-slate-300"
                              >
                                LAB {k.lab.kode} · {k.room.kode || 'tanpa kode'} → ruangan={k.room.key}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            Ganti nama ruangan di NodeMCU dengan salah satu ID di atas.
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          Tidak ada di master ruangan. Samakan dengan ID perangkat pada panduan di
                          bawah.
                        </p>
                      )}

                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        {num(r.latest?.suhu)}°C · {num(r.latest?.kelembapan)}% ·{' '}
                        {r.latest ? timeAgo(r.latest.waktu) : '—'}
                        <span className={online ? 'text-emerald-600' : 'text-red-500'}>
                          {online ? ' · Online' : r.latest ? ' · Offline' : ''}
                        </span>
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleRoom(r.ruangan)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          <FaHistory className="h-3 w-3" />
                          Riwayat
                        </button>
                        <button
                          type="button"
                          onClick={() => exportTxt(r.ruangan)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          <FaDownload className="h-3 w-3" />
                          Export
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ===== Panduan ingest NodeMCU (collapsible) ===== */}
          <section className="glass-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-md shadow-cyan-500/25">
                  <FaInfoCircle className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                    Panduan pemasangan sensor baru
                  </span>
                  <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                    Nama ruangan pada NodeMCU harus sama dengan kode ruang
                  </span>
                </span>
              </span>
              <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-300">
                {showGuide ? 'Sembunyikan' : 'Tampilkan'}
              </span>
            </button>

            {showGuide && (
              <div className="space-y-3 border-t border-white/50 px-5 py-4 dark:border-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kirim data ke endpoint ingest memakai <code>ruangan</code> = ID perangkat ruangan
                  (contoh untuk lab {lab.nama} kode {lab.kode}:{' '}
                  <code className="font-mono">{exampleKey}</code> — daftar lengkapnya ada di bawah).
                  Nama ruangan yang dipakai NodeMCU <b>tidak boleh</b> <code>localhost</code> — pakai
                  IP komputer yang menjalankan backend:
                </p>
                <div className="space-y-2">
                  {sensorInfo?.contohUrl?.length ? (
                    sensorInfo.contohUrl.map((url) => (
                      <code
                        key={url}
                        className="block overflow-x-auto rounded-xl bg-white/70 px-3 py-2 text-left text-xs text-cyan-700 dark:bg-white/10 dark:text-cyan-300"
                      >
                        {url}
                      </code>
                    ))
                  ) : (
                    <code className="block overflow-x-auto rounded-xl bg-white/70 px-3 py-2 text-left text-xs text-cyan-700 dark:bg-white/10 dark:text-cyan-300">
                      {ingestExample}
                    </code>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Untuk rutin “cek koneksi” di sketch (tanpa mengirim data), pakai{' '}
                  <code className="font-mono">{`${API_BASE}/sensor/ping`}</code> → dibalas{' '}
                  <code>{`{"success":true}`}</code>. Endpoint <code>/ingest</code> sengaja menolak
                  (HTTP <b>400</b>) bila suhu/kelembapan/ruangan tidak ikut dikirim, supaya tidak ada
                  baris kosong di tabel.
                </p>
                {sensorInfo?.addresses?.length ? (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Alamat IP yang bisa dipakai NodeMCU: {sensorInfo.addresses.join(', ')} (port{' '}
                    {sensorInfo.port})
                  </p>
                ) : null}

                {/* Daftar ID perangkat lab aktif — inilah nilai `ruangan`/`device_id`
                    yang harus dikirim NodeMCU agar masuk ke kartu ruangan yang benar. */}
                <div className="rounded-xl border border-white/60 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Daftar ID perangkat — {lab.nama} (kode {lab.kode})
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                    {deviceIdsOf(lab).map((d) => (
                      <div key={d.id} className="flex items-center gap-2 text-[11px]">
                        <span className="w-16 shrink-0 font-mono font-semibold text-slate-500 dark:text-slate-400">
                          {d.kode || '—'}
                        </span>
                        <code
                          className="truncate font-mono text-slate-600 dark:text-slate-300"
                          title={d.nama}
                        >
                          {d.id}
                        </code>
                        {!d.unik && (
                          <span className="shrink-0 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                            WAJIB KODE
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                    Ruangan bertanda <b>WAJIB KODE</b> namanya sama dengan ruangan di lab lain (mis.
                    "Ruang Staf" ada di E-2, D-2, F.2), jadi perangkat harus mengirim ID di kolom
                    kanan — bukan nama ruangannya. Ruangan lain boleh memakai nama ruangan apa adanya.
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Sketch ESP8266/ESP32 juga boleh mengirim <b>JSON</b> (POST body) berisi{' '}
                  <code>temperature</code>, <code>humidity</code>, dan <code>device_id</code> atau{' '}
                  <code>ruangan</code> — data tambahan seperti <code>dew_point</code>,{' '}
                  <code>heat_index</code>, dan status ikut tersimpan. Ruangan yang belum cocok akan
                  muncul di bagian “Ruangan sensor yang belum bisa ditempatkan” supaya bisa dibetulkan.
                </p>
              </div>
            )}
          </section>

          {/* ===== Riwayat ruangan (modal) ===== */}
          {activeInfo && (
            <RiwayatModal
              kode={activeInfo.kode}
              nama={activeInfo.nama}
              labKode={activeInfo.labKode}
              accent={activeInfo.accent}
              latest={activeInfo.latest}
              status={statusInfo(activeInfo.latest)}
              alarm={alarmInfo(activeInfo.latest)}
              online={isOnline(activeInfo.latest?.waktu)}
              hist={hist}
              histLoading={histLoading}
              onClose={() => {
                setActive(null);
                setHist(null);
              }}
              onPage={changePage}
              onExport={() => exportTxt(active)}
            />
          )}
        </div>
    </>
  );
}
