// pages/pemantauan-suhu/index.js
/**
 * HALAMAN: PEMANTAUAN SUHU & KELEMBAPAN
 * -------------------------------------
 * Halaman ini sengaja TIPIS — hanya menyiapkan <Head> + layout global.
 * Seluruh logika & tampilan modul ada di:
 *   components/pemantauan-suhu/Container.js
 *   components/pemantauan-suhu/helper.js
 *
 * ==== KONVENSI STRUKTUR APLIKASI ====
 * Tambah modul baru dengan pola yang sama:
 *   pages/<modul>/index.js            -> halaman tipis (file ini)
 *   components/<modul>/Container.js   -> logika + tampilan modul
 *   components/<modul>/helper.js      -> konstanta & formatter (tanpa state/API)
 *   components/<modul>/Modal.js       -> dialog modul, bila ada
 * File di luar folder modul (mis. components/DashboardLayout.js,
 * components/ThemeRegistry.js, _app/_document/404) adalah level aplikasi,
 * bukan bagian dari modul.
 * ====================================
 */
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';
import { BRAND } from '../../components/Brand';
import PemantauanSuhuContainer from '../../components/pemantauan-suhu/Container';

export default function PemantauanSuhuPage() {
  return (
    <>
      <Head>
        <title>{`Pemantauan Suhu | ${BRAND.name}`}</title>
      </Head>

      <DashboardLayout pageTitle="Pemantauan Suhu">
        <PemantauanSuhuContainer />
      </DashboardLayout>
    </>
  );
}
