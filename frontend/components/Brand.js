// components/Brand.js
/**
 * BRAND — Let's Digital
 * ---------------------
 * Satu-satunya sumber identitas aplikasi (single source of truth).
 * Ubah nama/tagline di `BRAND` -> seluruh aplikasi (login, sidebar, beranda,
 * 404, judul tab) ikut berubah. Palet brand = cyan -> biru (lihat
 * `BRAND_GRADIENT`) dan sudah selaras dengan `styles/globals.css`.
 *
 * Ekspor:
 *   BRAND              -> konstanta teks brand (nama, tagline, deskripsi, versi)
 *   BrandGlyph         -> glyph monogram "LD" (SVG, memakai `currentColor`)
 *   BrandMark          -> glyph di dalam petak gradien (logo ikon)
 *   BrandWordmark      -> teks "Let's Digital" (+ subjudul opsional)
 *   default Brand      -> lockup lengkap mark + wordmark, bisa diberi `href`
 *
 * Catatan teknis: gradien petak memakai utility Tailwind, BUKAN
 * <linearGradient> SVG, supaya beberapa logo dalam satu halaman tidak
 * berebut `id` gradien yang sama.
 */

import Link from 'next/link';

export const BRAND = {
  name: "Let's Digital",
  lead: "Let's",
  main: 'Digital',
  monogram: 'LD',
  // Baris kecil di bawah nama (sidebar/login)
  subtitle: 'Sistem Informasi Laboratorium',
  // Kalimat penjelas resmi
  tagline: 'Satu pintu layanan digital laboratorium',
  taglineShort: 'Laboratorium dalam satu pintu',
  description:
    "Let's Digital adalah platform internal untuk digitalisasi layanan laboratorium.",
  version: '1.0',
  // Dipakai untuk <title> halaman: "Beranda | Let's Digital"
  titleSuffix: "Let's Digital",
  footerNote: 'Aplikasi internal',
};

/** Gradien brand (cyan -> biru) — dipakai petak logo & aksen. */
export const BRAND_GRADIENT = 'from-cyan-400 via-sky-500 to-blue-600';

const MARK_SIZES = {
  xs: 'h-6 w-6 rounded-md',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-lg',
  lg: 'h-11 w-11 rounded-xl',
  xl: 'h-14 w-14 rounded-2xl',
  '2xl': 'h-16 w-16 rounded-[1.25rem]',
};

const GLYPH_SIZES = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-[1.15rem] w-[1.15rem]',
  md: 'h-[1.3rem] w-[1.3rem]',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
  '2xl': 'h-9 w-9',
};

const TEXT_SIZES = {
  xs: { name: 'text-[13px]', sub: 'text-[8px]' },
  sm: { name: 'text-sm', sub: 'text-[9px]' },
  md: { name: 'text-[15px]', sub: 'text-[9px]' },
  lg: { name: 'text-lg', sub: 'text-[10px]' },
  xl: { name: 'text-2xl', sub: 'text-[11px]' },
  '2xl': { name: 'text-3xl', sub: 'text-xs' },
};

/**
 * Glyph monogram: huruf "L" (garis) + "D" (bidang) pada grid 48x48.
 * Memakai `currentColor` supaya warnanya mengikuti elemen induk.
 */
export function BrandGlyph({ className = '' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* L */}
      <path
        d="M14 12v24h10"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* D */}
      <path d="M29 12h1.2a12 12 0 0 1 0 24H29z" fill="currentColor" />
    </svg>
  );
}

/** Logo ikon: glyph putih di atas petak bergradien brand. */
export function BrandMark({ size = 'md', glow = true, className = '', title }) {
  const labelled = Boolean(title);
  return (
    <span
      role={labelled ? 'img' : undefined}
      aria-label={title}
      aria-hidden={labelled ? undefined : 'true'}
      className={`relative inline-flex shrink-0 items-center justify-center bg-gradient-to-br ${BRAND_GRADIENT} text-white ring-1 ring-inset ring-white/25 ${
        MARK_SIZES[size] || MARK_SIZES.md
      } ${glow ? 'shadow-lg shadow-cyan-500/30' : ''} ${className}`}
    >
      <BrandGlyph className={GLYPH_SIZES[size] || GLYPH_SIZES.md} />
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-white/0 via-white/5 to-white/25"
        />
      )}
    </span>
  );
}

/**
 * Teks brand. `tone`:
 *   'onDark' -> untuk latar gelap (sidebar, panel gradien): teks putih
 *   'onLight' / 'auto' -> untuk latar terang: slate, otomatis gelap di dark mode
 * `gradient` -> kata "Digital" memakai gradien brand.
 */
export function BrandWordmark({
  size = 'md',
  tone = 'auto',
  subtitle,
  gradient = false,
  className = '',
}) {
  const t = TEXT_SIZES[size] || TEXT_SIZES.md;
  const onDark = tone === 'onDark';
  const leadClass = onDark ? 'text-white/65' : 'text-slate-500 dark:text-slate-400';
  const mainClass = gradient
    ? 'text-gradient-cyan'
    : onDark
      ? 'text-white'
      : 'text-slate-900 dark:text-white';
  const subClass = onDark
    ? 'text-cyan-200/60'
    : 'text-slate-400 dark:text-slate-500';

  return (
    <span className={`flex min-w-0 flex-col justify-center ${className}`}>
      <span className={`truncate font-semibold leading-none tracking-tight ${t.name}`}>
        <span className={`font-light ${leadClass}`}>{BRAND.lead}</span>{' '}
        <span className={`font-extrabold ${mainClass}`}>{BRAND.main}</span>
      </span>
      {subtitle && (
        <span
          className={`mt-1.5 truncate font-medium uppercase leading-none tracking-[0.16em] ${t.sub} ${subClass}`}
        >
          {subtitle}
        </span>
      )}
    </span>
  );
}

/** Lockup lengkap (mark + wordmark). Beri `href` untuk menjadikannya tautan. */
export default function Brand({
  size = 'md',
  tone = 'auto',
  subtitle,
  gradient = false,
  glow = true,
  href,
  className = '',
  markClassName = '',
}) {
  const lockup = (
    <>
      <BrandMark size={size} glow={glow} className={markClassName} />
      <BrandWordmark
        size={size}
        tone={tone}
        subtitle={subtitle}
        gradient={gradient}
        className="min-w-0"
      />
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={BRAND.name}
        className={`inline-flex min-w-0 items-center gap-2.5 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${className}`}
      >
        {lockup}
      </Link>
    );
  }

  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>{lockup}</span>
  );
}
