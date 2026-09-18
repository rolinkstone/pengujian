// pages/login.js
/**
 * HALAMAN LOGIN — Let's Digital
 * -----------------------------
 * Pintu masuk aplikasi dengan identitas brand "Let's Digital" (nama, logo, dan
 * tagline diambil dari components/Brand.js agar konsisten di seluruh halaman).
 * Tampilan "glassmorphism" aksen cyan (biru laut) = palet brand, mendukung
 * dark mode (class "dark" di <html>). Autentikasi via SSO Keycloak (NextAuth).
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import Head from 'next/head';
import {
  FaShieldAlt,
  FaThermometerHalf,
  FaFileExport,
  FaSpinner,
  FaLock,
  FaCircle,
} from 'react-icons/fa';
import Brand, { BRAND } from '../components/Brand';

const features = [
  {
    icon: FaShieldAlt,
    title: 'Autentikasi SSO',
    desc: 'Masuk sekali dengan akun terpusat yang aman.',
  },
  {
    icon: FaThermometerHalf,
    title: 'Pemantauan Langsung',
    desc: 'Pantau kondisi ruang dan perangkat laboratorium secara real-time.',
  },
  {
    icon: FaFileExport,
    title: 'Riwayat & Ekspor',
    desc: 'Data pembacaan tersimpan rapi dan siap diekspor untuk pelaporan.',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Pesan saat diarahkan ke sini karena sesi kedaluwarsa
  useEffect(() => {
    if (router.query.error === 'session_expired') {
      setError(
        'Sesi Anda telah berakhir karena token kedaluwarsa. Silakan masuk kembali menggunakan SSO.'
      );
    }
  }, [router.query.error]);

  const handleSSOLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signIn('keycloak', { callbackUrl: '/' });
    } catch (err) {
      setError('Gagal terhubung ke server SSO. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`Masuk | ${BRAND.name}`}</title>
        <meta
          name="description"
          content={`${BRAND.name} — ${BRAND.tagline}. Masuk menggunakan akun SSO untuk mengakses dashboard.`}
        />
      </Head>

      {/* ================= LAYAR LOGIN ================= */}
      <div className="app-gradient relative flex min-h-screen items-center justify-center overflow-hidden p-4 text-slate-800 dark:text-slate-100 sm:p-8">
        {/* Gumpalan warna latar */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob absolute -right-16 -top-28 h-96 w-96 rounded-full bg-cyan-400/30 blur-3xl dark:bg-cyan-500/20" />
          <div className="animate-blob-slow absolute -left-28 top-1/4 h-96 w-96 rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-500/20" />
          <div className="animate-blob absolute -bottom-32 right-1/4 h-[26rem] w-[26rem] rounded-full bg-sky-400/25 blur-3xl dark:bg-sky-500/15" />
          {/* Pola grid halus */}
          <div
            className="absolute inset-0 opacity-40 dark:opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(rgba(8,145,178,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(8,145,178,0.07) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              WebkitMaskImage:
                'radial-gradient(ellipse at center, black 20%, transparent 75%)',
              maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
            }}
          />
        </div>

        <div className="animate-rise relative w-full max-w-5xl">
          {/* Kartu kaca utama */}
          <div className="glass-card grid overflow-hidden !rounded-3xl ring-1 ring-black/5 dark:ring-white/5 lg:grid-cols-5">
            {/* ===== KIRI — HERO BRAND ===== */}
            <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 p-10 text-white lg:col-span-2 lg:flex">
              {/* Dekorasi */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="absolute left-10 top-24 h-40 w-40 rounded-full border border-white/10" />
                <div className="absolute left-24 top-32 h-24 w-24 rounded-full border border-white/10" />
              </div>

              <div className="relative">
                <Brand size="lg" tone="onDark" subtitle={BRAND.subtitle} />
              </div>

              {/* Lead + fitur unggulan */}
              <div className="relative">
                <p className="max-w-sm text-sm leading-relaxed text-cyan-50/90">
                  {BRAND.description}
                </p>

                {/* Fitur unggulan */}
                <div className="mt-9 space-y-5">
                  {features.map((f) => {
                    const Icon = f.icon;
                    return (
                      <div key={f.title} className="flex items-start gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm">
                          <Icon className="h-4 w-4 text-cyan-100" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{f.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-cyan-50/80">{f.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer brand */}
              <div className="relative mt-auto pt-10">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/15 pt-5 text-xs text-cyan-100/70">
                  <span className="inline-flex items-center gap-2">
                    <FaCircle className="h-2 w-2 animate-pulse text-emerald-300" />
                    Sistem aktif
                  </span>
                  <span className="text-cyan-100/40">•</span>
                  <span>
                    {BRAND.name} v{BRAND.version}
                  </span>
                </div>
              </div>
            </div>

            {/* ===== KANAN — FORM LOGIN ===== */}
            <div className="flex items-center p-7 sm:p-10 lg:col-span-3">
              <div className="animate-rise-1 mx-auto w-full max-w-md">
                {/* Lockup brand (tampil hanya di layar kecil) */}
                <div className="mb-7 flex items-center justify-center lg:hidden">
                  <Brand size="lg" subtitle={BRAND.subtitle} />
                </div>

                {/* Judul */}
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  Selamat Datang di{' '}
                  <span className="text-gradient-cyan">{BRAND.name}</span>
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Masuk menggunakan akun SSO untuk mengakses{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    dashboard {BRAND.name}
                  </span>
                  .
                </p>

                {/* Error */}
                {error && (
                  <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    <span className="mt-0.5">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Tombol SSO */}
                <button
                  onClick={handleSSOLogin}
                  disabled={isLoading}
                  className="btn-primary mt-8 w-full"
                >
                  {isLoading ? (
                    <FaSpinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <FaLock className="h-4 w-4" />
                  )}
                  <span>{isLoading ? 'Mengarahkan ke SSO…' : 'Masuk dengan SSO'}</span>
                </button>

                {/* Catatan */}
                <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                  Anda akan diarahkan ke halaman autentikasi terpusat (SSO) untuk
                  memverifikasi identitas.
                </p>

                {/* Info sistem */}
                <div className="glass-card mt-8 divide-y divide-black/5 dark:divide-white/10">
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Status Sistem</span>
                    <span className="inline-flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      Aktif
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Autentikasi</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">SSO</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Lingkungan</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Internal</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Versi</span>
                    <span className="badge-primary">{BRAND.name} v{BRAND.version}</span>
                  </div>
                </div>

                {/* Bantuan */}
                <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  Butuh bantuan? Hubungi administrator sistem.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
