// components/DashboardLayout.js
/**
 * LAYOUT DASHBOARD — Let's Digital
 * --------------------------------
 * Kerangka halaman aplikasi: sidebar + top bar. Identitas brand (nama, logo,
 * tagline) diambil dari components/Brand.js supaya konsisten di semua halaman.
 * Gaya: "glassmorphism" aksen cyan (biru laut) = palet brand. Mendukung DARK
 * MODE (class "dark" di <html>, tersimpan di localStorage key "theme").
 *
 * Struktur:
 *  - Latar gradien dinamis + gumpalan warna mengambang (fixed)
 *  - Sidebar kiri transparan (blur) + aksen cyan, bisa di-minimize jadi ikon
 *    (saat minimize hanya logo brand yang tampil)
 *  - Top bar kaca: toggle dark mode, toggle minimize, menu user
 */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  FaBars,
  FaTimes,
  FaHome,
  FaSignOutAlt,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaSun,
  FaMoon,
  FaThermometerHalf,
} from 'react-icons/fa';
import Brand, { BRAND, BrandMark } from './Brand';

const NAV_ITEMS = [
  { label: 'Beranda', href: '/', icon: FaHome },
  { label: 'Pemantauan Suhu', href: '/pemantauan-suhu', icon: FaThermometerHalf },
];

export default function DashboardLayout({ children, pageTitle = 'Beranda' }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  const [sidebarOpen, setSidebarOpen] = useState(false); // khusus mobile
  const [isCollapsed, setIsCollapsed] = useState(false); // minimize sidebar (desktop)
  const [isDark, setIsDark] = useState(false); // dark mode
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const themeAppliedRef = useRef(false);
  const userMenuRef = useRef(null);

  // ===== Dark mode: inisialisasi dari localStorage / preferensi sistem =====
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    themeAppliedRef.current = true;
  }, []);

  // ===== Dark mode: terapkan saat berubah (lewati run pertama) =====
  useEffect(() => {
    if (!themeAppliedRef.current) return;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleDark = () => setIsDark((v) => !v);

  // Redirect ke /login bila belum login
  useEffect(() => {
    if (!loading && !session) {
      router.push('/login');
    }
  }, [loading, session, router]);

  // Tutup dropdown user saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==== Logout NextAuth + Keycloak SSO ====
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({ callbackUrl: '/login', redirect: false });
      const idToken = session?.idToken;
      const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER;
      const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'local-pengujian';
      const origin = window.location.origin;

      if (idToken && issuer) {
        const keycloakLogoutUrl = `${issuer}/protocol/openid-connect/logout?id_token_hint=${idToken}&post_logout_redirect_uri=${origin}/login&client_id=${clientId}`;
        window.location.href = keycloakLogoutUrl;
      } else {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  // ==== Data user ====
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

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // ================================================
  //  STATE LOADING
  // ================================================
  if (loading) {
    return (
      <div className="app-gradient flex min-h-screen flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
        <BrandMark size="xl" className="animate-pulse" />
        <p className="animate-pulse text-sm">Memuat {BRAND.name}…</p>
      </div>
    );
  }

  // Redirect akan terjadi via useEffect di atas
  if (!session) return null;

  const isActive = (href) => router.pathname === href;

  return (
    <div className="relative min-h-screen text-slate-800 dark:text-slate-100">
      {/* ===== Latar kaca (fixed): gradien + gumpalan ===== */}
      <div aria-hidden="true" className="app-gradient fixed inset-0 -z-10" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-blob absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-cyan-400/25 blur-3xl dark:bg-cyan-500/15" />
        <div className="animate-blob-slow absolute -left-32 top-1/3 h-[24rem] w-[24rem] rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-500/15" />
        <div className="animate-blob absolute -bottom-40 right-1/4 h-[28rem] w-[28rem] rounded-full bg-sky-400/25 blur-3xl dark:bg-sky-500/10" />
      </div>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#0a1524]/90 shadow-2xl shadow-black/40 backdrop-blur-2xl transition-all duration-300 dark:bg-[#04090f]/90 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'md:w-[4.5rem]' : 'md:w-64'}`}
        style={{
          backgroundImage:
            'radial-gradient(24rem 12rem at -20% -10%, rgba(6,182,212,0.22), transparent 60%), radial-gradient(22rem 18rem at 120% 115%, rgba(56,189,248,0.12), transparent 60%)',
        }}
      >
        {/* Brand — Let's Digital (klik untuk kembali ke beranda) */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-white/10 ${
            isCollapsed ? 'justify-center px-2' : 'px-4'
          }`}
        >
          <Brand
            href="/"
            size={isCollapsed ? 'md' : 'sm'}
            tone="onDark"
            subtitle={isCollapsed ? undefined : BRAND.subtitle}
            className="min-w-0"
          />
        </div>

        {/* Navigasi */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {!isCollapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Menu
            </p>
          )}
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3.5 py-2.5'
                  } ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/25'
                      : 'text-slate-300/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Tempat modul baru (draf) */}
          {isCollapsed ? (
            <div className="pt-4">
              <FaPlus
                className="mx-auto h-3.5 w-3.5 text-cyan-400/60"
                title="Modul menyusul"
                aria-label="Modul menyusul"
              />
            </div>
          ) : (
            <>
              <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Modul
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-cyan-400/40 px-3.5 py-2.5 text-sm text-slate-400">
                <FaPlus className="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                <span className="text-xs">Menu modul aplikasi menyusul di sini</span>
              </div>
            </>
          )}
        </nav>

        {/* User (footer sidebar) */}
        <div className="shrink-0 border-t border-white/10 px-3 py-3">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-semibold text-white shadow-md shadow-cyan-500/25"
                title={displayName}
              >
                {initials}
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Keluar"
                aria-label="Keluar"
                className="text-slate-400 transition-colors hover:text-cyan-300 disabled:opacity-50"
              >
                <FaSignOutAlt className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2 py-1.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-semibold text-white shadow-md shadow-cyan-500/25">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {roleLabel}
                </p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Keluar"
                aria-label="Keluar"
                className="text-slate-400 transition-colors hover:text-cyan-300 disabled:opacity-50"
              >
                <FaSignOutAlt className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ================= KONTEN ================= */}
      <div
        className={`flex min-h-screen flex-col transition-[padding] duration-300 ${
          isCollapsed ? 'md:pl-[4.5rem]' : 'md:pl-64'
        }`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-white/60 bg-white/55 px-4 backdrop-blur-2xl dark:border-white/10 dark:bg-[#071120]/55 sm:gap-4 sm:px-6">
          {/* Mobile: buka drawer */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white md:hidden"
            aria-label="Buka menu"
          >
            <FaBars className="h-5 w-5" />
          </button>

          {/* Desktop: minimize / perluas sidebar */}
          <button
            onClick={() => setIsCollapsed((v) => !v)}
            className="hidden items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white md:inline-flex"
            aria-label={isCollapsed ? 'Perluas menu samping' : 'Minimalkan menu samping'}
            title={isCollapsed ? 'Perluas menu' : 'Minimalkan menu'}
          >
            {isCollapsed ? (
              <FaChevronRight className="h-4 w-4" />
            ) : (
              <FaChevronLeft className="h-4 w-4" />
            )}
          </button>

          <div className="min-w-0">
            <h1 className="truncate font-semibold leading-tight text-slate-900 dark:text-white">
              {pageTitle}
            </h1>
            <p className="hidden text-xs text-slate-400 dark:text-slate-500 sm:block">{today}</p>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-cyan-500 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-cyan-300"
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
              title={isDark ? 'Mode terang' : 'Mode gelap'}
            >
              {isDark ? <FaSun className="h-4 w-4" /> : <FaMoon className="h-4 w-4" />}
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/70 dark:hover:bg-white/10"
                aria-label="Menu pengguna"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-white shadow-md shadow-cyan-500/20">
                  {initials}
                </div>
                <div className="hidden text-left md:block">
                  <p className="max-w-[160px] truncate text-sm font-medium leading-tight text-slate-800 dark:text-white">
                    {displayName}
                  </p>
                  <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                    {roleLabel}
                  </p>
                </div>
                <FaChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-white/70 bg-white/85 py-2 shadow-2xl shadow-cyan-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/85 dark:shadow-black/40">
                  <div className="border-b border-black/5 px-4 py-2.5 dark:border-white/10">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                      {user.email || roleLabel}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <FaSignOutAlt className="h-4 w-4" />
                    <span>{isLoggingOut ? 'Keluar…' : 'Keluar'}</span>
                  </button>
                  {/* Identitas brand di kaki menu user */}
                  <div className="mt-1 flex items-center gap-2 border-t border-black/5 px-4 pb-1 pt-2.5 text-[11px] text-slate-400 dark:border-white/10 dark:text-slate-500">
                    <BrandMark size="xs" glow={false} />
                    <span className="truncate">
                      {BRAND.name} v{BRAND.version}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Konten halaman */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Tombol tutup sidebar (mobile, dalam aside) */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed left-[17rem] top-4 z-40 text-slate-400 transition-colors hover:text-white md:hidden"
          aria-label="Tutup menu"
        >
          <FaTimes className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
