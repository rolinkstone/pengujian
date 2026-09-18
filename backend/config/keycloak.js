const path = require('path');

// File ini sengaja membaca path ABSOLUT (relatif terhadap lokasi file),
// supaya tetap benar walau dijalankan dari folder lain / dari dalam container.
//
//   .env       -> sumber utama (di-commit HANYA versi .env.example)
//   .env.local -> opsional, hanya untuk override saat development lokal
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Validasi environment variables.
// Di dalam container, nilai-nilai ini biasanya datang dari docker-compose
// (bukan dari file .env), jadi kekurangan konfigurasi TIDAK mematikan proses
// di sini - cukup dicatat supaya mudah didiagnosis dari `docker compose logs`.
const requiredEnvVars = [
    'KEYCLOAK_SERVER_URL',
    'KEYCLOAK_REALM',
    'KEYCLOAK_ADMIN_USERNAME',
    'KEYCLOAK_ADMIN_PASSWORD'
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Keycloak: variabel belum di-set -> ${missingEnvVars.join(', ')}`);
    console.warn('    Isi lewat .env (development) atau environment docker-compose (produksi).');
}

// ========== KEYCLOAK CONFIGURATION ==========
const KEYCLOAK_CONFIG = {
    serverUrl: process.env.KEYCLOAK_SERVER_URL,
    realm: process.env.KEYCLOAK_REALM,
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'local-pengujian',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME,
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD
};

// Jangan pernah mencetak nilai rahasia ke log.
console.log(`✅ Keycloak: realm=${KEYCLOAK_CONFIG.realm} server=${KEYCLOAK_CONFIG.serverUrl}`);

module.exports = KEYCLOAK_CONFIG;