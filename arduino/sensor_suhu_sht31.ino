// =====================================================
// MONITORING SUHU & KELEMBAPAN — SHT31 (ESP8266 / NodeMCU)
// - Mengirim data ke backend aplikasi "Pengujian" (ExpressJS)
//     POST http://<SERVER_HOST>:5003/api/sensor/ingest
//     GET  http://<SERVER_HOST>:5003/api/sensor/ping    (cek koneksi)
//   SERVER_HOST diambil dari arduino/secrets.h
//     - produksi : 192.168.15.4 (server Docker)
//     - dev lokal: 192.168.15.1 (komputer pengembang)
//
// CARA PAKAI UNTUK RUANGAN LAIN
//   1. Ubah `deviceId` menjadi ID perangkat ruangan tersebut.
//      Daftar ID ada di aplikasi: Pemantauan Suhu ->
//      "Panduan pemasangan sensor baru" (mis. e_5_1, d_6, f_2).
//      Ruangan yang namanya sama di beberapa lab (mis. "Ruang Staf")
//      WAJIB memakai kode ruang, bukan nama ruangan.
//   2. Ubah `ssid` / `password` di arduino/secrets.h bila Wi-Fi berbeda.
//
// CEK CEPAT TANPA MENUNGGU JADWAL
//   Tekan tombol RST pada NodeMCU -> saat boot sketch langsung
//   mengirim satu "DATA AWAL" (tidak menunggu jam 09:00 / 14:30).
//
// CATATAN PENTING
//   - `checkBackend()` memakai endpoint /ping (bukan /ingest).
//     Endpoint /ingest sengaja menolak request tanpa data (HTTP 400),
//     jadi jangan dipakai untuk sekadar mengetes koneksi.
//   - Semua panggilan Serial.println() sekarang tidak memakai delay,
//     sehingga jadwal pengiriman tidak pernah tertunda oleh buzzer.
// =====================================================

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <time.h>

// =====================================================
// WIFI + ALAMAT SERVER
// Semua kredensial & alamat ada di "secrets.h" (TIDAK di-commit).
// Kalau file itu belum ada:
//     Copy-Item arduino\secrets.example.h arduino\secrets.h
// lalu isi ssid / password / SERVER_HOST.
// =====================================================
#include "secrets.h"

// Alamat backend disusun otomatis dari SERVER_HOST + SERVER_PORT
String serverUrl = String("http://") + SERVER_HOST + ":" + SERVER_PORT +
                   "/api/sensor/ingest";

String pingUrl = String("http://") + SERVER_HOST + ":" + SERVER_PORT +
                 "/api/sensor/ping";

// =====================================================
// IDENTITAS PERANGKAT
// Nilai inilah yang menentukan ruangan di aplikasi.
// =====================================================
const char* deviceId =
  "Ruang Manajer Mutu ISO/IEC 17025";

// Nama tampilan ruangan (opsional, hanya dikirim sebagai info;
// backend memakai `device_id` / `ruangan` untuk menentukan ruangan)
const char* roomName =
  "Ruang Manajer Mutu ISO/IEC 17025";

// =====================================================
// PIN
// =====================================================
#define SDA_PIN D2
#define SCL_PIN D1
#define BUZZER_PIN D5

// =====================================================
// BATAS SUHU ALARM (sesuaikan dengan SOP ruangan ini)
// =====================================================
const float BATAS_SUHU = 35.0;

// =====================================================
// SHT31
// =====================================================
Adafruit_SHT31 sht31 = Adafruit_SHT31();

// =====================================================
// NTP
// WIB = UTC + 7
// =====================================================
const long GMT_OFFSET_SEC = 7 * 3600;
const int DAYLIGHT_OFFSET_SEC = 0;

// =====================================================
// STATUS
// =====================================================
bool ntpReady = false;
bool backendConnected = false;

unsigned long lastBackendCheck = 0;
unsigned long lastScheduleCheck = 0;

const unsigned long BACKEND_CHECK_INTERVAL = 30000; // 30 detik

// MODE UJI: true  = kirim data tiap 60 detik (abaikan jadwal, untuk pengujian)
//           false = hanya mengikuti jadwal 09:00-10:00 & 14:30-15:30
// JANGAN lupa kembalikan ke false setelah alat dipasang di ruangan.
const bool MODE_UJI = false;
const unsigned long UJI_INTERVAL = 60000UL;
unsigned long lastUjiKirim = 0;


// =====================================================
// FUNGSI BUZZER (tanpa delay, loop tidak terhambat)
// Pola: BEEP 500 ms, diam 2000 ms, berulang selama suhu di atas batas.
// =====================================================
const unsigned long BEEP_DURATION = 500;
const unsigned long BEEP_INTERVAL = 2500;

unsigned long lastBeep = 0;
bool buzzerOn = false;

void updateBuzzer(float temperature) {

  unsigned long now = millis();

  // Suhu aman (atau sensor gagal dibaca) -> buzzer mati
  if (isnan(temperature) || temperature <= BATAS_SUHU) {

    digitalWrite(BUZZER_PIN, LOW);
    buzzerOn = false;

    return;
  }

  // Mulai beep
  if (!buzzerOn && (now - lastBeep >= BEEP_INTERVAL)) {

    digitalWrite(BUZZER_PIN, HIGH);

    buzzerOn = true;
    lastBeep = now;

    return;
  }

  // Akhiri beep
  if (buzzerOn && (now - lastBeep >= BEEP_DURATION)) {

    digitalWrite(BUZZER_PIN, LOW);

    buzzerOn = false;
  }
}


// =====================================================
// CEK KONEKSI BACKEND (memakai endpoint /ping)
// =====================================================
bool checkBackend() {

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println();
    Serial.println("=======================================");
    Serial.println("BACKEND : TIDAK TERHUBUNG");
    Serial.println("Alasan  : WiFi tidak terhubung");
    Serial.println("=======================================");

    backendConnected = false;

    return false;
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println();
  Serial.println("---------------------------------------");
  Serial.println("Mengecek koneksi ke backend...");
  Serial.print("Backend : ");
  Serial.println(pingUrl);

  if (!http.begin(client, pingUrl)) {

    Serial.println("BACKEND : TIDAK TERHUBUNG");
    Serial.println("Gagal membuka koneksi HTTP");

    backendConnected = false;

    return false;
  }

  // /ping tidak butuh body maupun parameter -> balasannya 200
  int httpCode = http.GET();

  Serial.print("HTTP Code : ");
  Serial.println(httpCode);

  if (httpCode == 200) {

    Serial.println("BACKEND : TERHUBUNG");

    String response = http.getString();

    if (response.length() > 0) {
      Serial.print("Response  : ");
      Serial.println(response);
    }

    backendConnected = true;

  } else {

    Serial.println("BACKEND : TIDAK TERHUBUNG");

    Serial.print("Error     : ");
    Serial.println(http.errorToString(httpCode));

    backendConnected = false;
  }

  http.end();

  Serial.println("---------------------------------------");

  return backendConnected;
}


// =====================================================
// FORMAT TANGGAL
// =====================================================
String getDate() {

  struct tm timeinfo;

  if (!getLocalTime(&timeinfo)) {
    return "";
  }

  char buffer[20];

  strftime(buffer, sizeof(buffer), "%Y-%m-%d", &timeinfo);

  return String(buffer);
}


// =====================================================
// FORMAT WAKTU
// =====================================================
String getTime() {

  struct tm timeinfo;

  if (!getLocalTime(&timeinfo)) {
    return "";
  }

  char buffer[20];

  strftime(buffer, sizeof(buffer), "%H:%M:%S", &timeinfo);

  return String(buffer);
}


// =====================================================
// CEK NTP
// =====================================================
bool checkNTP() {

  struct tm timeinfo;

  if (getLocalTime(&timeinfo)) {

    ntpReady = true;

    Serial.print("Waktu NTP : ");
    Serial.println(getTime());

    return true;
  }

  ntpReady = false;

  return false;
}


// =====================================================
// ANGKA UNTUK JSON
// JSON tidak mengenal nan/inf, jadi nilai tidak valid dikirim "null"
// supaya backend tidak menolak body-nya.
// (Tanpa argumen default — Arduino IDE membuat ulang prototype fungsi
//  sendiri, dan argumen default bisa memicu error "redefinition".)
// =====================================================
String jsonNumber(float value) {

  if (isnan(value) || isinf(value)) {
    return "null";
  }

  return String(value, 2);
}


// =====================================================
// HITUNG DEW POINT
// =====================================================
float calculateDewPoint(float temperature, float humidity) {

  if (humidity <= 0 || humidity > 100) {
    return NAN;
  }

  const float a = 17.62;
  const float b = 243.12;

  float gamma =
    log(humidity / 100.0) +
    (a * temperature) / (b + temperature);

  float dewPoint =
    (b * gamma) / (a - gamma);

  return dewPoint;
}


// =====================================================
// HITUNG HEAT INDEX
// =====================================================
float calculateHeatIndex(float temperature, float humidity) {

  float T = temperature;
  float R = humidity;

  float HI =
    -8.784695 +
    1.61139411 * T +
    2.338549 * R -
    0.14611605 * T * R -
    0.012308094 * T * T -
    0.016424828 * R * R +
    0.002211732 * T * T * R +
    0.00072546 * T * R * R -
    0.000003582 * T * T * R * R;

  return HI;
}


// =====================================================
// KIRIM DATA KE EXPRESSJS
// =====================================================
bool sendSensorData(bool initialReading) {

  // ---------------------------------------------------
  // Cek WiFi
  // ---------------------------------------------------
  if (WiFi.status() != WL_CONNECTED) {

    Serial.println();
    Serial.println("DATA TIDAK DIKIRIM");
    Serial.println("WiFi tidak terhubung");

    return false;
  }


  // ---------------------------------------------------
  // Baca SHT31
  // ---------------------------------------------------
  float temperature = sht31.readTemperature();
  float humidity = sht31.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {

    Serial.println();
    Serial.println("GAGAL MEMBACA SHT31");

    return false;
  }


  // ---------------------------------------------------
  // Hitung
  // ---------------------------------------------------
  float dewPoint =
    calculateDewPoint(temperature, humidity);

  float heatIndex =
    calculateHeatIndex(temperature, humidity);


  // ---------------------------------------------------
  // Status suhu
  // ---------------------------------------------------
  String temperatureStatus;

  if (temperature > BATAS_SUHU) {
    temperatureStatus = "TINGGI";
  } else {
    temperatureStatus = "NORMAL";
  }


  // ---------------------------------------------------
  // Status humidity
  // ---------------------------------------------------
  String humidityStatus;

  if (humidity < 40) {

    humidityStatus = "RENDAH";

  }
  else if (humidity <= 60) {

    humidityStatus = "NORMAL";

  }
  else if (humidity <= 70) {

    humidityStatus = "LEMBAP";

  }
  else {

    humidityStatus = "TINGGI";
  }


  // ---------------------------------------------------
  // Status alarm
  // ---------------------------------------------------
  String alarmStatus;

  if (temperature > BATAS_SUHU) {
    alarmStatus = "AKTIF";
  } else {
    alarmStatus = "NORMAL";
  }


  // ---------------------------------------------------
  // Waktu
  // ---------------------------------------------------
  String readingDate = getDate();
  String readingTime = getTime();


  // ---------------------------------------------------
  // JSON
  // ---------------------------------------------------
  String json = "{";

  json += "\"device_id\":\"";
  json += deviceId;
  json += "\",";

  json += "\"room_name\":\"";
  json += roomName;
  json += "\",";

  json += "\"reading_date\":\"";
  json += readingDate;
  json += "\",";

  json += "\"reading_time\":\"";
  json += readingTime;
  json += "\",";

  json += "\"temperature\":";
  json += jsonNumber(temperature);
  json += ",";

  json += "\"humidity\":";
  json += jsonNumber(humidity);
  json += ",";

  json += "\"dew_point\":";
  json += jsonNumber(dewPoint);
  json += ",";

  json += "\"heat_index\":";
  json += jsonNumber(heatIndex);
  json += ",";

  json += "\"temperature_status\":\"";
  json += temperatureStatus;
  json += "\",";

  json += "\"humidity_status\":\"";
  json += humidityStatus;
  json += "\",";

  json += "\"alarm_status\":\"";
  json += alarmStatus;
  json += "\",";

  json += "\"initial_reading\":";
  json += initialReading ? "true" : "false";
  json += ",";

  json += "\"ntp_ready\":";
  json += ntpReady ? "true" : "false";

  json += "}";


  // ---------------------------------------------------
  // Tampilkan data
  // ---------------------------------------------------
  Serial.println();
  Serial.println("=======================================");
  Serial.println("          DATA SENSOR");
  Serial.println("=======================================");

  Serial.print("Suhu       : ");
  Serial.print(temperature, 2);
  Serial.println(" C");

  Serial.print("Humidity   : ");
  Serial.print(humidity, 2);
  Serial.println(" %");

  Serial.print("Dew Point  : ");
  Serial.print(dewPoint, 2);
  Serial.println(" C");

  Serial.print("Heat Index : ");
  Serial.print(heatIndex, 2);
  Serial.println(" C");

  Serial.print("Status Suhu: ");
  Serial.println(temperatureStatus);

  Serial.print("Alarm      : ");
  Serial.println(alarmStatus);

  Serial.print("Tanggal    : ");
  Serial.println(readingDate);

  Serial.print("Waktu      : ");
  Serial.println(readingTime);

  Serial.print("Initial    : ");
  Serial.println(initialReading ? "YA" : "TIDAK");


  // ---------------------------------------------------
  // POST
  // ---------------------------------------------------
  WiFiClient client;
  HTTPClient http;

  Serial.println();
  Serial.println("Mengirim data ke backend...");
  Serial.print("URL: ");
  Serial.println(serverUrl);

  if (!http.begin(client, serverUrl)) {

    Serial.println();
    Serial.println("BACKEND TIDAK TERHUBUNG");
    Serial.println("Gagal membuka koneksi HTTP");

    backendConnected = false;

    return false;
  }

  http.addHeader("Content-Type", "application/json");

  int httpCode =
    http.POST(json);


  // ---------------------------------------------------
  // HASIL
  // ---------------------------------------------------
  Serial.println();
  Serial.println("=======================================");
  Serial.println("           HASIL PENGIRIMAN");
  Serial.println("=======================================");

  Serial.print("HTTP Code : ");
  Serial.println(httpCode);


  if (httpCode > 0) {

    String response =
      http.getString();

    Serial.println();
    Serial.print("Response  : ");
    Serial.println(response);


    // HTTP 2xx = berhasil
    if (httpCode >= 200 && httpCode < 300) {

      Serial.println();
      Serial.println("BACKEND TERHUBUNG");
      Serial.println("DATA BERHASIL DIKIRIM");

      backendConnected = true;

    }
    else {

      Serial.println();
      Serial.println("BACKEND TERHUBUNG");
      Serial.println("SERVER MENOLAK DATA - lihat bagian \"diterima\" di Response");

      backendConnected = true;
    }

  }
  else {

    Serial.println();
    Serial.println("BACKEND TIDAK TERHUBUNG");

    Serial.print("Error: ");
    Serial.println(http.errorToString(httpCode));

    backendConnected = false;
  }


  Serial.println("=======================================");

  http.end();

  return (httpCode >= 200 && httpCode < 300);
}


// =====================================================
// CEK JADWAL PENGIRIMAN
// Pagi : 09:00 - 10:00
// Sore : 14:30 - 15:30
// (setiap 10 menit)
// =====================================================
bool isScheduleTime() {

  if (!ntpReady) {
    return false;
  }

  struct tm timeinfo;

  if (!getLocalTime(&timeinfo)) {
    return false;
  }

  int hour = timeinfo.tm_hour;
  int minute = timeinfo.tm_min;
  int second = timeinfo.tm_sec;


  // ---------------------------------------------------
  // Hanya eksekusi sekitar awal menit
  // ---------------------------------------------------
  if (second > 10) {
    return false;
  }


  // ---------------------------------------------------
  // PAGI
  // ---------------------------------------------------
  if (hour == 9) {

    if (minute % 10 == 0) {
      return true;
    }
  }

  if (hour == 10 && minute == 0) {
    return true;
  }


  // ---------------------------------------------------
  // SORE
  // ---------------------------------------------------
  if (hour == 14 && minute >= 30) {

    if ((minute - 30) % 10 == 0) {
      return true;
    }
  }

  if (hour == 15) {

    if (minute == 0 ||
        minute == 10 ||
        minute == 20 ||
        minute == 30) {

      return true;
    }
  }

  return false;
}


// =====================================================
// CONNECT WIFI
// =====================================================
void connectWiFi() {

  Serial.println();
  Serial.println("=======================================");
  Serial.println("           CONNECTING WIFI");
  Serial.println("=======================================");

  Serial.print("SSID: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);

  WiFi.begin(ssid, password);

  int retry = 0;

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);

    Serial.print(".");

    retry++;

    if (retry >= 60) {

      Serial.println();
      Serial.println("WIFI GAGAL TERHUBUNG");

      ESP.restart();
    }
  }

  Serial.println();
  Serial.println();
  Serial.println("WIFI TERHUBUNG");

  Serial.print("IP NodeMCU : ");
  Serial.println(WiFi.localIP());

  Serial.print("Gateway    : ");
  Serial.println(WiFi.gatewayIP());

  Serial.print("DNS        : ");
  Serial.println(WiFi.dnsIP());

  Serial.println("=======================================");
}


// =====================================================
// SETUP
// =====================================================
void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println();
  Serial.println("=======================================");
  Serial.println("     MONITORING SUHU & KELEMBAPAN");
  Serial.println("=======================================");
  Serial.println("Ruang:");
  Serial.println(roomName);
  Serial.println("ID perangkat:");
  Serial.println(deviceId);
  Serial.println("=======================================");


  // ---------------------------------------------------
  // Buzzer
  // ---------------------------------------------------
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);


  // ---------------------------------------------------
  // I2C
  // ---------------------------------------------------
  Wire.begin(SDA_PIN, SCL_PIN);


  // ---------------------------------------------------
  // SHT31
  // ---------------------------------------------------
  Serial.println();
  Serial.println("Mendeteksi SHT31...");

  if (!sht31.begin(0x44)) {

    Serial.println("SHT31 TIDAK TERDETEKSI");

    while (true) {

      digitalWrite(BUZZER_PIN, HIGH);
      delay(200);

      digitalWrite(BUZZER_PIN, LOW);
      delay(800);
    }
  }

  Serial.println("SHT31 TERDETEKSI");


  // ---------------------------------------------------
  // WiFi
  // ---------------------------------------------------
  connectWiFi();


  // ---------------------------------------------------
  // NTP
  // ---------------------------------------------------
  Serial.println();
  Serial.println("Sinkronisasi waktu NTP...");

  configTime(
    GMT_OFFSET_SEC,
    DAYLIGHT_OFFSET_SEC,
    "time.google.com",
    "pool.ntp.org",
    "time.nist.gov"
  );


  // ---------------------------------------------------
  // Tunggu NTP maksimal 10 detik
  // ---------------------------------------------------
  int ntpRetry = 0;

  while (!checkNTP() && ntpRetry < 20) {

    Serial.print(".");

    delay(500);

    ntpRetry++;
  }

  Serial.println();

  if (ntpReady) {

    Serial.println("NTP TERHUBUNG");

  } else {

    Serial.println("NTP TIDAK TERHUBUNG");
    Serial.println("Data awal tetap akan dikirim (waktu akan diisi server).");
  }


  // ---------------------------------------------------
  // CEK KONEKSI BACKEND (/ping)
  // ---------------------------------------------------
  Serial.println();
  Serial.println("=======================================");
  Serial.println("       CEK KONEKSI BACKEND");
  Serial.println("=======================================");

  checkBackend();


  // ---------------------------------------------------
  // KIRIM DATA AWAL (tanpa menunggu jadwal)
  // ---------------------------------------------------
  Serial.println();
  Serial.println("=======================================");
  Serial.println("         DATA AWAL");
  Serial.println("=======================================");

  bool result =
    sendSensorData(true);

  if (result) {

    Serial.println("DATA AWAL BERHASIL DIKIRIM");

  } else {

    Serial.println("DATA AWAL GAGAL DIKIRIM");
    Serial.println("NodeMCU akan mencoba lagi pada jadwal berikutnya.");
  }


  // ---------------------------------------------------
  // SISTEM SIAP
  // ---------------------------------------------------
  Serial.println();
  Serial.println("=======================================");
  Serial.println("             SISTEM SIAP");
  Serial.println("=======================================");

  Serial.println("Backend:");
  Serial.println(
    backendConnected
    ? "TERHUBUNG"
    : "TIDAK TERHUBUNG"
  );

  Serial.println();
  Serial.println("ID perangkat : ");
  Serial.println(deviceId);

  Serial.println();
  Serial.print("Alarm suhu   : > ");
  Serial.print(BATAS_SUHU, 1);
  Serial.println(" C");

  Serial.println("Pagi         : 09:00 - 10:00");
  Serial.println("Sore         : 14:30 - 15:30");
  Serial.println("Interval     : 10 menit");

  Serial.print("Mode uji     : ");
  Serial.println(MODE_UJI ? "AKTIF (kirim tiap 60 detik)" : "TIDAK");

  Serial.println("=======================================");
}


// =====================================================
// LOOP
// =====================================================
void loop() {

  // ---------------------------------------------------
  // Pastikan WiFi tetap terhubung
  // ---------------------------------------------------
  if (WiFi.status() != WL_CONNECTED) {

    Serial.println();
    Serial.println("WIFI TERPUTUS");

    connectWiFi();

    // Setelah WiFi kembali, cek backend
    checkBackend();
  }


  // ---------------------------------------------------
  // Baca sensor + jalankan buzzer (tanpa delay)
  // ---------------------------------------------------
  float temperature =
    sht31.readTemperature();

  updateBuzzer(temperature);


  // ---------------------------------------------------
  // Cek backend setiap 30 detik
  // ---------------------------------------------------
  if (millis() - lastBackendCheck >=
      BACKEND_CHECK_INTERVAL) {

    lastBackendCheck = millis();

    checkBackend();
  }


  // ---------------------------------------------------
  // MODE UJI: kirim tiap 60 detik tanpa menunggu jadwal
  // ---------------------------------------------------
  if (MODE_UJI) {

    if (millis() - lastUjiKirim >= UJI_INTERVAL) {

      lastUjiKirim = millis();

      Serial.println();
      Serial.println(">>> MODE UJI: KIRIM DATA <<<");

      sendSensorData(false);
    }
  }


  // ---------------------------------------------------
  // Cek jadwal pengiriman
  // ---------------------------------------------------
  if (millis() - lastScheduleCheck >= 1000) {

    lastScheduleCheck = millis();

    if (isScheduleTime()) {

      static int lastMinute = -1;

      struct tm timeinfo;

      if (getLocalTime(&timeinfo)) {

        int currentMinute =
          timeinfo.tm_hour * 60 +
          timeinfo.tm_min;

        if (currentMinute != lastMinute) {

          lastMinute = currentMinute;

          Serial.println();
          Serial.println("=======================================");
          Serial.println("       JADWAL PENGIRIMAN SENSOR");
          Serial.println("=======================================");

          sendSensorData(false);
        }
      }
    }
  }


  delay(100);
}
