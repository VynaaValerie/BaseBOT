import { config } from "../config.js";
import { setWebhook } from "../lib/telegram.js";

const [siteUrlArg] = process.argv.slice(2);
const botToken = config.botToken;
const webhookSecret = config.webhookSecret;

if (!botToken) {
  console.error("❌ Error: botToken belum diisi di config.js");
  process.exit(1);
}

const siteUrlInput = siteUrlArg || config.vercelUrl;
if (!siteUrlInput) {
  console.log("=================================================");
  console.log(" Cara Penggunaan Skrip Pendaftaran Webhook:");
  console.log(" npm run set-webhook -- https://NAMA-PROYEK.vercel.app");
  console.log(" Atau isi 'vercelUrl' di file config.js");
  console.log("=================================================");
  process.exit(1);
}

let siteUrl;
try {
  siteUrl = new URL(siteUrlInput);
} catch {
  console.error("❌ Masukkan URL HTTPS Vercel yang valid (contoh: https://my-bot.vercel.app)");
  process.exit(1);
}

if (siteUrl.protocol !== "https:") {
  console.error("❌ Telegram mewajibkan URL Webhook menggunakan protokol HTTPS.");
  process.exit(1);
}

// Pastikan endpoint webhook mengarah ke /api/webhook
const webhookUrl = new URL("/api/webhook", siteUrl).toString();

console.log(`📡 Mendaftarkan webhook ke Telegram...`);
console.log(`🔗 Webhook URL: ${webhookUrl}`);

try {
  const result = await setWebhook(webhookUrl, webhookSecret);
  console.log("✅ Berhasil! Webhook Telegram telah aktif.");
  console.log("🎉 Sekarang kamu bisa membuka bot Telegram kamu dan mengetik /start atau /ping !");
} catch (error) {
  console.error(`❌ Gagal mendaftarkan webhook: ${error.message}`);
  process.exit(1);
}
