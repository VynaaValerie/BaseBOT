# 🤖 Evalyn Bot Telegram untuk Vercel (Serverless)

Base bot Telegram modern, ringan, dan super cepat untuk **Vercel Serverless**. Dibuat menggunakan **Node.js (>= 20.x / 24.x)** murni tanpa dependensi eksternal (`zero-dependency`).

Semua konfigurasi (Token Bot, ID Owner, Secret Token, dll) tersimpan langsung di [config.js](file:///home/runner/workspace/config.js) tanpa memerlukan `process.env` atau file `.env`.

---

## ✨ Fitur-Fitur Bot

Selain fitur `/ping`, bot ini dibekali dengan kemampuan mencari informasi dari internet secara real-time:

| Perintah | Keterangan |
| :--- | :--- |
| `/start` | Menampilkan pesan sambutan & menu fitur |
| `/help` atau `/menu` | Panduan lengkap cara menggunakan bot |
| `/ping` | Cek status server, latensi (ms), uptime, versi Node.js & status owner |
| `/cari <kata kunci>` | **Mencari informasi di internet** secara real-time via DuckDuckGo & Web Search |
| `/wiki <topik>` | Mencari ringkasan artikel ensiklopedia di Wikipedia Indonesia & Inggris |
| `/cuaca <kota>` | Mengecek prakiraan cuaca terkini (contoh: `/cuaca Jakarta`, `/cuaca Bandung`) |
| `/gempa` | Informasi gempa bumi terkini dari BMKG Indonesia |
| *(Kirim teks biasa)* | Jika `autoSearchOnText: true`, bot otomatis mencari jawaban di internet |

---

## ⚙️ Pengaturan di `config.js`

Buka file [config.js](file:///home/runner/workspace/config.js) untuk mengubah pengaturan:

```javascript
export const config = Object.freeze({
  // Token bot Telegram dari @BotFather
  botToken: "7566732177:AAE-T7PHhqiP-so74HZUBVuHlTcusiMbGr8",

  // ID Telegram Pemilik (Owner)
  ownerChatId: "1618920755",

  // Secret token untuk keamanan webhook Telegram
  webhookSecret: "EvalynBot_Secret_Key_2026",

  // Nama bot
  botName: "Evalyn Bot",

  // URL Vercel (opsional, jika diisi tidak perlu ketik URL lagi saat `npm run set-webhook`)
  vercelUrl: "",

  // Batasi hanya owner yang dapat menggunakan bot (true = hanya owner, false = semua pengguna)
  onlyOwner: false,

  // Balas otomatis mencari ke internet jika pesan bukan command
  autoSearchOnText: true,

  // Pesan balasan ping default
  pingReplyText: "🏓 Pong! Bot aktif dan siap melayani.",
});
```

---

## 🚀 Cara Deploy ke Vercel

### Langkah 1: Push ke GitHub & Impor ke Vercel
1. Simpan dan push proyek ini ke repositori GitHub Anda.
2. Buka dashboard [Vercel](https://vercel.com/) dan klik **Add New...** -> **Project**.
3. Pilih repositori GitHub bot Anda, lalu klik **Deploy**.
4. Setelah proses deploy selesai (biasanya hanya 2-5 detik karena tidak ada dependensi berat), Anda akan mendapatkan URL Vercel (misalnya `https://evalyn-bot.vercel.app`).

*(Opsional: Anda juga bisa mengetes endpoint di browser dengan membuka `https://evalyn-bot.vercel.app/api/webhook`. Jika berhasil, akan muncul respon JSON berstatus online).*

### Langkah 2: Daftarkan Webhook ke Telegram
Di komputer lokal Anda, jalankan perintah berikut (ganti dengan URL proyek Vercel Anda):

```sh
npm run set-webhook -- https://evalyn-bot.vercel.app
```

> **Catatan:** Skrip akan otomatis membaca token bot dan secret token langsung dari [config.js](file:///home/runner/workspace/config.js) serta mendaftarkan URL `/api/webhook` ke Telegram.

---

## 🛠️ Perintah Berguna (NPM Scripts)

```sh
# 1. Menjalankan pengujian (Unit test)
npm test

# 2. Mendaftarkan webhook ke Telegram
npm run set-webhook -- https://evalyn-bot.vercel.app

# 3. Cek status webhook Telegram saat ini
npm run check-webhook

# 4. Hapus webhook Telegram
npm run delete-webhook
```

---

## 📁 Struktur Direktori

```text
├── api/
│   └── webhook.js        # Handler serverless function Vercel
├── lib/
│   ├── search.js         # Mesin pencari internet, Wikipedia, cuaca, & BMKG
│   └── telegram.js       # Helper API Telegram (sendMessage, webhook, escapeHtml)
├── scripts/
│   ├── set-webhook.js    # Skrip pendaftaran webhook ke Telegram
│   ├── check-webhook.js  # Skrip cek status webhook
│   └── delete-webhook.js # Skrip hapus webhook
├── test/
│   └── webhook.test.js   # Unit test lengkap menggunakan node:test
├── config.js             # Konfigurasi terpusat (Token, ID Owner, dll)
├── package.json          # Metadata proyek & skrip npm
├── vercel.json           # Konfigurasi routing Vercel
└── README.md             # Dokumentasi
```
