// utils/axiosInstance.js
import axios from 'axios';
import { handleAuthFailure, isSessionFailure } from './authInterceptor';

// Buat axios instance dengan interceptor
const createAxiosInstance = (baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api') => {
  const instance = axios.create({
    baseURL,
    timeout: 30000, // 30 detik timeout
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // CATATAN KEAMANAN: token TIDAK boleh diambil dari localStorage/sessionStorage.
  // Storage browser dapat dibaca JavaScript mana pun (XSS/ekstensi), dan token
  // di sana juga bertahan lebih lama dari sesi. Sumber token satu-satunya adalah
  // cookie sesi NextAuth yang httpOnly.
  //
  // Semua endpoint backend yang dipakai aplikasi saat ini bersifat publik
  // (/api/sensor/*) sehingga tidak memerlukan header Authorization. Bila nanti
  // ada endpoint backend yang butuh token, buat route proxy di sisi server
  // (pages/api/**) yang mengambil token dari cookie httpOnly lewat getToken()
  // lalu meneruskannya ke backend — jangan kirim token mentah ke browser.

  // Response interceptor untuk handle error autentikasi
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response) {
        const { status } = error.response;
        // Hanya anggap 401/403 (yang bukan penolakan peran FORBIDDEN)
        // sebagai kegagalan sesi -> logout & redirect ke /login.
        if ((status === 401 || status === 403) && isSessionFailure(status, error.response.data)) {
          console.warn(`Unauthorized access (${status}) - token mungkin expired`);
          handleAuthFailure();
        } else if (status === 404) {
          console.error('Endpoint tidak ditemukan');
        }
      } else if (error.request) {
        // Request dibuat tapi tidak ada response
        console.error('No response received:', error.request);
      } else {
        // Error saat setup request
        console.error('Request setup error:', error.message);
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Ekspor instance yang sudah dibuat
export const axiosInstance = createAxiosInstance();

// Ekspor fungsi untuk membuat instance baru jika diperlukan
export default createAxiosInstance;