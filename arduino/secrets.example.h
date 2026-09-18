#pragma once
// =====================================================
//  TEMPLATE KREDENSIAL  ->  salin jadi "secrets.h"
//
//     Copy-Item arduino\secrets.example.h arduino\secrets.h
//
//  File "secrets.h" TIDAK di-commit (lihat .gitignore) karena
//  memuat password Wi-Fi.
// =====================================================

// ---------- Wi-Fi ----------
const char* ssid     = "NAMA_WIFI";
const char* password = "PASSWORD_WIFI";

// ---------- Alamat server backend ----------
//   192.168.15.4 = server PRODUKSI (Docker)
//   192.168.15.1 = komputer pengembang (dev lokal)
const char* SERVER_HOST = "192.168.15.4";
const int   SERVER_PORT = 5003;
