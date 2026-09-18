// pages/404.js
// Halaman 404 — memakai identitas brand Let's Digital (components/Brand.js).
import Head from 'next/head';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { BRAND, BrandMark } from '../components/Brand';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>{`Halaman Tidak Ditemukan | ${BRAND.name}`}</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="app-gradient relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-slate-800 dark:text-slate-100">
        {/* Gumpalan latar */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob absolute -right-20 -top-24 h-80 w-80 rounded-full bg-cyan-400/25 blur-3xl dark:bg-cyan-500/15" />
          <div className="animate-blob-slow absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-500/15" />
        </div>

        <div className="glass-card animate-rise relative w-full max-w-md p-10 text-center ring-1 ring-black/5 dark:ring-white/5">
          <div className="mb-5 flex justify-center">
            <BrandMark size="2xl" />
          </div>
          <p className="text-6xl font-extrabold leading-none text-cyan-200/70 dark:text-cyan-500/25">
            404
          </p>
          <h1 className="mt-4 text-lg font-semibold text-slate-800 dark:text-white">
            Halaman tidak ditemukan
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Halaman yang Anda cari mungkin telah dihapus, dipindahkan, atau tidak
            pernah ada di {BRAND.name}.
          </p>
          <Link
            href="/"
            className="btn-primary mt-6 !w-full"
          >
            <FaArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Beranda
          </Link>
          <p className="mt-6 text-[11px] text-slate-400 dark:text-slate-500">
            {BRAND.name} v{BRAND.version} — {BRAND.subtitle}
          </p>
        </div>
      </div>
    </>
  );
}
