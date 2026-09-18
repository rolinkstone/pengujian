// pages/index.js
/**
 * BERANDA — Let's Digital
 * -----------------------
 * Halaman utama aplikasi. Identitas brand (nama, logo, tagline) diambil dari
 * components/Brand.js supaya seragam dengan login, sidebar, dan 404.
 * Tampilan "glassmorphism" aksen cyan = palet brand. Mendukung dark mode
 * (class "dark" di <html>).
 */
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../components/DashboardLayout';
import { BRAND, BrandMark } from '../components/Brand';
import {
  FaPlus,
  FaUsers,
  FaChartLine,
  FaLayerGroup,
  FaServer,
  FaCheckCircle,
} from 'react-icons/fa';

const greetings = [
  { text: 'Selamat pagi', range: [0, 10] },
  { text: 'Selamat siang', range: [10, 15] },
  { text: 'Selamat sore', range: [15, 18] },
  { text: 'Selamat malam', range: [18, 24] },
];

const getGreeting = () => {
  const h = new Date().getHours();
  return greetings.find((g) => h >= g.range[0] && h < g.range[1]) || greetings[0];
};

// Kartu metrik placeholder — siap diganti data modul asli
const statSlots = [
  {
    label: 'Modul Terpasang',
    value: '0',
    note: 'Belum ada modul',
    icon: FaLayerGroup,
    tone: 'from-cyan-500 to-sky-500',
    glow: 'shadow-cyan-500/30',
  },
  {
    label: 'Pengguna Terdaftar',
    value: '0',
    note: 'Via SSO internal',
    icon: FaUsers,
    tone: 'from-sky-500 to-indigo-500',
    glow: 'shadow-sky-500/30',
  },
  {
    label: 'Aktivitas Hari Ini',
    value: '—',
    note: 'Belum ada data',
    icon: FaChartLine,
    tone: 'from-indigo-500 to-violet-500',
    glow: 'shadow-indigo-500/30',
  },
  {
    label: 'Status Sistem',
    value: 'Aktif',
    note: 'SSO terhubung',
    icon: FaServer,
    tone: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/30',
  },
];

export default function Home() {
  const { data: session, status } = useSession();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(getGreeting().text);
    const interval = setInterval(() => setGreeting(getGreeting().text), 60000);
    return () => clearInterval(interval);
  }, []);

  const loading = status === 'loading';
  const user = session?.user || {};
  const displayName =
    user.name ||
    user.username ||
    (user.email ? user.email.split('@')[0] : '') ||
    'Pengguna';
  const initials =
    displayName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';
  const roleLabel =
    typeof user.role === 'string' && user.role ? user.role : 'User';

  if (loading) {
    return (
      <div className="app-gradient flex min-h-screen flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
        <BrandMark size="xl" className="animate-pulse" />
        <p className="animate-pulse text-sm">Memuat {BRAND.name}…</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{`Beranda | ${BRAND.name}`}</title>
      </Head>
      <DashboardLayout pageTitle="Beranda">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* ===== Sapaan ===== */}
          <section className="glass-card relative overflow-hidden p-6 sm:p-8">
            {/* Dekorasi */}
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/15" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-500/10" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative inline-flex shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-extrabold text-white shadow-lg shadow-cyan-500/30">
                  {initials}
                </div>
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#071120]">
                  <FaCheckCircle className="h-3 w-3 text-white" />
                </span>
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="glass-chip text-cyan-600 dark:text-cyan-300">
                    <BrandMark size="xs" glow={false} />
                    {BRAND.name}
                  </span>
                  <span className="glass-chip">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    SSO Aktif
                  </span>
                  <span className="badge-primary">{BRAND.taglineShort}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {greeting}, <span className="text-gradient-cyan">{displayName}</span>
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Selamat datang di {BRAND.name} — {BRAND.tagline} ({roleLabel}). Pilih modul pada
                  menu samping untuk mulai bekerja.
                </p>
              </div>
            </div>
          </section>

          {/* ===== Ringkasan (placeholder) ===== */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Ringkasan
              </h3>
              <span className="glass-chip text-slate-400 dark:text-slate-500">Segera hadir</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statSlots.map((slot) => {
                const Icon = slot.icon;
                return (
                  <div
                    key={slot.label}
                    className="glass-card-hover flex flex-col justify-between p-5"
                  >
                    <div
                      className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${slot.tone} text-white shadow-lg ${slot.glow}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {slot.value}
                      </p>
                      <p className="mt-0.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                        {slot.label}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{slot.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===== Empty state utama ===== */}
          <section className="glass-card flex flex-col items-center px-6 py-16 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
              <BrandMark size="2xl" className="relative" />
            </div>

            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              Belum ada modul lain yang terpasang
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Modul <strong>Pemantauan Suhu</strong> sudah aktif di {BRAND.name}. Tambahkan modul
              berikutnya dengan menambah menu pada{' '}
              <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs text-cyan-700 dark:bg-white/10 dark:text-cyan-300">
                components/DashboardLayout.js
              </code>{' '}
              dan halaman pada{' '}
              <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs text-cyan-700 dark:bg-white/10 dark:text-cyan-300">
                pages/
              </code>
              .
            </p>

            <button
              type="button"
              className="btn-primary mt-6 cursor-default !opacity-90"
              aria-disabled="true"
            >
              <FaPlus className="h-3.5 w-3.5" />
              <span>Tambah modul aplikasi</span>
            </button>
          </section>

          {/* ===== Kaki halaman: identitas brand ===== */}
          <footer className="flex flex-col items-center gap-2 pb-2 text-center">
            <BrandMark size="sm" glow={false} />
            <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
              {BRAND.name} v{BRAND.version} — {BRAND.subtitle}
              <br />
              {BRAND.footerNote}
            </p>
          </footer>
        </div>
      </DashboardLayout>
    </>
  );
}
