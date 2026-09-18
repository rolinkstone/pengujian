// components/pemantauan-suhu/Modal.js
/**
 * MODAL — Modul Pemantauan Suhu & Kelembapan
 * -------------------------------------------
 * Sesuai konvensi struktur aplikasi: dialog milik modul ditaruh terpisah di
 * `components/<modul>/Modal.js`, sedangkan state & request API tetap di
 * `Container.js` (file ini murni tampilan).
 *
 * Isi:
 *   Modal        -> kerangka dialog kaca yang bisa dipakai ulang
 *                   (overlay, tutup via Esc / klik luar, kunci scroll body)
 *   RiwayatModal -> dialog riwayat satu ruangan: ringkasan suhu/kelembapan
 *                   TERBARU di bagian atas (supaya info suhu dan riwayat tidak
 *                   berjauhan lagi), tabel riwayat, pagination, dan export.
 */
import { useEffect, useRef } from 'react';
import {
  FaTimes,
  FaHistory,
  FaDownload,
  FaChevronLeft,
  FaChevronRight,
  FaBell,
} from 'react-icons/fa';
import { num, timeAgo, alarmInfo } from './helper';

/**
 * Kerangka dialog: overlay gelap + panel kaca.
 * `children` dirender apa adanya di dalam panel, jadi header/body/footer
 * bisa diatur oleh pemanggil (lihat RiwayatModal).
 */
export function Modal({ onClose, labelledBy, maxWidth = 'max-w-5xl', children }) {
  const panelRef = useRef(null);

  // Esc untuk menutup + kunci scroll halaman selama dialog terbuka
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Fokuskan panel agar Esc & Tab langsung bekerja di dalam dialog
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {/* Latar gelap — klik untuk menutup */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={`glass-card animate-rise relative flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden focus:outline-none`}
      >
        {children}
      </div>
    </div>
  );
}

// Satu kotak ringkasan (Suhu / Kelembapan / Titik Embun / Indeks Panas)
function StatBox({ label, value, unit, tone }) {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-2xl font-extrabold ${tone}`}>
        {value}
        {value === '—' ? null : <span className="text-sm font-semibold">{unit}</span>}
      </p>
    </div>
  );
}

/**
 * Dialog riwayat satu ruangan.
 *
 * Props:
 *   kode/nama  -> identitas ruangan master (kode ruang + nama ruang)
 *   labKode    -> kode lab (E/D/F), boleh null (ruangan di luar master)
 *   accent     -> aksen warna lab aktif (dari LABS[].accent)
 *   latest     -> data sensor terbaru { suhu, kelembapan, dew_point, ... }
 *   status     -> hasil statusInfo(latest) -> { label, cls }
 *   online     -> isOnline(latest.waktu)
 *   hist       -> { rows, page, totalPages, total, limit }
 *   histLoading, onClose, onPage(step), onExport
 */
export default function RiwayatModal({
  kode,
  nama,
  labKode,
  accent,
  latest,
  status,
  alarm,
  online,
  hist,
  histLoading,
  onClose,
  onPage,
  onExport,
}) {
  const rows = hist?.rows || [];
  const page = hist?.page || 1;
  const totalPages = hist?.totalPages || 1;

  return (
    <Modal onClose={onClose} labelledBy="riwayat-judul">
      {/* ===== Header ===== */}
      <div className="flex items-start justify-between gap-3 border-b border-white/50 bg-white/40 px-5 py-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent.grad} text-white shadow-lg ${accent.glow}`}
          >
            <FaHistory className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id="riwayat-judul"
                className="text-sm font-semibold text-slate-900 dark:text-white"
              >
                Riwayat Suhu & Kelembapan
              </h3>
              {kode && (
                <span
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${accent.soft}`}
                >
                  {kode}
                </span>
              )}
              {alarm && alarm.on && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                  <FaBell className="h-3 w-3" />
                  ALARM
                </span>
              )}
              {labKode && (
                <span className="rounded-md bg-slate-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  LAB {labKode}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{nama}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  latest ? (online ? 'bg-emerald-500' : 'bg-red-500') : 'bg-slate-400'
                }`}
              />
              {latest ? (online ? 'Online' : 'Offline') : 'Belum ada data'}
              {latest ? ` · update ${timeAgo(latest.waktu)}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Tutup riwayat"
        >
          <FaTimes className="h-4 w-4" />
        </button>
      </div>

      {/* ===== Ringkasan data terbaru (biar dekat dengan riwayatnya) ===== */}
      <div className="border-b border-white/50 px-5 py-4 dark:border-white/10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Pembacaan terbaru
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {alarm &&
              (alarm.on ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                  <FaBell className="h-3 w-3" />
                  ALARM{alarm.sumber === 'perkiraan' ? ' (perkiraan)' : ''}
                </span>
              ) : latest?.alarm_status ? (
                <span className="glass-chip text-[11px]">Alarm: {latest.alarm_status}</span>
              ) : null)}
            {latest?.humidity_status && (
              <span className="glass-chip text-[11px]">RH: {latest.humidity_status}</span>
            )}
            {latest?.device_id && (
              <span className="glass-chip text-[11px]">{latest.device_id}</span>
            )}
            {latest && (
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.cls}`}>
                {status.label}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Suhu" value={num(latest?.suhu)} unit="°C" tone={accent.text} />
          <StatBox
            label="Kelembapan"
            value={num(latest?.kelembapan)}
            unit="%"
            tone="text-slate-700 dark:text-slate-200"
          />
          <StatBox
            label="Titik Embun"
            value={num(latest?.dew_point)}
            unit="°C"
            tone="text-slate-700 dark:text-slate-200"
          />
          <StatBox
            label="Indeks Panas"
            value={num(latest?.heat_index)}
            unit="°C"
            tone="text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>

      {/* ===== Tabel riwayat (scroll di dalam modal) ===== */}
      <div className="min-h-[220px] flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-white/90 text-left text-xs uppercase tracking-wide text-slate-400 backdrop-blur dark:bg-slate-900/90 dark:text-slate-500">
              <th className="px-5 py-3 font-semibold">Waktu</th>
              <th className="px-5 py-3 text-center font-semibold">Suhu (°C)</th>
              <th className="px-5 py-3 text-center font-semibold">Kelembapan (%)</th>
              <th className="px-5 py-3 text-center font-semibold">Titik Embun (°C)</th>
              <th className="px-5 py-3 text-center font-semibold">Indeks Panas (°C)</th>
              <th className="px-5 py-3 text-center font-semibold">Status</th>
              <th className="px-5 py-3 text-center font-semibold">Alarm</th>
            </tr>
          </thead>
          <tbody>
            {histLoading && !hist ? (
              <tr>
                <td colSpan="7" className="px-5 py-10 text-center text-slate-400">
                  <span className="animate-pulse">Memuat data…</span>
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r) => {
                const hot = Number(r.suhu) >= 35;
                return (
                  <tr
                    key={r.id}
                    className="border-t border-white/40 text-slate-600 transition-colors hover:bg-white/40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <td className="px-5 py-2.5 whitespace-nowrap">{r.waktu}</td>
                    <td
                      className={`px-5 py-2.5 text-center font-semibold ${
                        hot ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {num(r.suhu)}°C
                    </td>
                    <td className="px-5 py-2.5 text-center font-medium">{num(r.kelembapan)}%</td>
                    <td className="px-5 py-2.5 text-center font-medium">
                      {r.dew_point === null || r.dew_point === undefined
                        ? '—'
                        : `${num(r.dew_point)}°C`}
                    </td>
                    <td className="px-5 py-2.5 text-center font-medium">
                      {r.heat_index === null || r.heat_index === undefined
                        ? '—'
                        : `${num(r.heat_index)}°C`}
                    </td>
                    <td className="px-5 py-2.5 text-center text-[11px] font-medium">
                      {r.temperature_status || '—'}
                      {r.humidity_status ? ` / ${r.humidity_status}` : ''}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      {alarmInfo(r)?.on ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                          <FaBell className="h-3 w-3" />
                          ALARM
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="px-5 py-10 text-center text-slate-400">
                  Belum ada data untuk ruangan ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Footer: export + pagination ===== */}
      <div className="flex flex-col gap-3 border-t border-white/40 bg-white/30 px-5 py-3 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            title="Unduh seluruh data sebagai .txt"
          >
            <FaDownload className="h-3 w-3" />
            Export .txt
          </button>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {hist ? `${hist.total} data · ${hist.limit}/halaman` : 'Memuat…'}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onPage(-1)}
            disabled={!hist || page <= 1}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <FaChevronLeft className="h-3 w-3" />
            Prev
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Halaman {hist ? page : '—'} / {hist ? totalPages : '—'}
          </span>
          <button
            type="button"
            onClick={() => onPage(1)}
            disabled={!hist || page >= totalPages}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Next
            <FaChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
