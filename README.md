# Aplikasi Pengujian — Let's Digital

Aplikasi pemantauan suhu & kelembapan ruangan laboratorium.

- **Backend** — Express + MySQL (`backend/`) — port **5003**
- **Frontend** — Next.js + NextAuth/Keycloak (`frontend/`) — port **3004**
- **Sensor** — NodeMCU / ESP8266 + SHT31 (`arduino/`)

## Menjalankan (development lokal)

```powershell
# Backend
cd backend
Copy-Item .env.example .env     # pertama kali saja
npm install
npm start                       # http://localhost:5003

# Frontend (terminal terpisah)
cd frontend
Copy-Item .env.example .env     # pertama kali saja
npm install
npm run dev                     # http://localhost:3004
```

## Menjalankan (produksi / Docker)

```powershell
Copy-Item .env.example .env     # lalu isi kredensialnya (lihat DEPLOY.md)
docker compose up -d --build
```

| | Alamat |
| --- | --- |
| Web  | https://lets-digital.bbpompky.id |
| API  | https://data-lets.bbpompky.id/api |
| Sensor (LAN) | `http://192.168.15.4:5003/api/sensor/ingest` |

Port internal di server: frontend `3004`, backend `5003`.

## Kredensial

File `.env` dan `arduino/secrets.h` **tidak ikut ter-commit**.
Selalu pakai file `.example` sebagai template. Detail lengkap ada di
[`DEPLOY.md`](DEPLOY.md).

## Endpoint sensor (publik, untuk NodeMCU)

| Endpoint                        | Keterangan                          |
| ------------------------------- | ----------------------------------- |
| `GET /api/sensor/ping`          | cek koneksi (tanpa data)            |
| `GET/POST /api/sensor/ingest`   | kirim data suhu & kelembapan        |
| `GET /api/sensor/rooms`         | daftar ruangan + pembacaan terbaru  |
| `GET /api/sensor/:room/data`    | riwayat (pagination)                |
| `GET /api/sensor/:room/export`  | unduh riwayat `.txt`                |
