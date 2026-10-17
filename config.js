/**
 * Konfigurasi Utama Bot Telegram
 * Semua konfigurasi tersimpan di sini (tanpa process.env).
 */
export const config = Object.freeze({
  // Token bot Telegram dari @BotFather
  botToken: "7566732177:AAE-T7PHhqiP-so74HZUBVuHlTcusiMbGr8",

  // ID Telegram Pemilik (Owner)
  ownerChatId: "1618920755",

  // Secret token untuk keamanan webhook Telegram (1-256 karakter alfanumerik / _ / -)
  webhookSecret: "EvalynBot_Secret_Key_2026",

  // Nama bot
  botName: "Evalyn Bot",

  // URL proyek Vercel Anda (opsional, jika diisi tidak perlu ketik URL lagi saat `npm run set-webhook`)
  // Contoh: "https://evalyn-bot.vercel.app"
  vercelUrl: "",

  // Batasi hanya owner yang dapat menggunakan bot
  // true = hanya ID owner yang direspons, false = publik (semua user bisa pakai)
  onlyOwner: false,

  // Otomatis cari jawaban di internet jika pesan yang dikirim bukan berupa command /
  autoSearchOnText: true,

  // Pesan balasan ping default
  pingReplyText: "🏓 Pong! Bot aktif dan siap melayani.",
});
