import { config } from "../config.js";
import { getWebhookInfo } from "../lib/telegram.js";

if (!config.botToken) {
  console.error("❌ Error: botToken belum diisi di config.js");
  process.exit(1);
}

try {
  console.log("🔍 Mengecek status webhook Telegram...");
  const info = await getWebhookInfo();

  console.log("\n📋 Informasi Webhook Saat Ini:");
  console.log(`• URL Webhook       : ${info.url || "(Belum terdaftar)"}`);
  console.log(`• Memiliki Sertifikat: ${info.has_custom_certificate ? "Ya" : "Tidak"}`);
  console.log(`• Pending Update    : ${info.pending_update_count}`);
  if (info.last_error_date) {
    const errorDate = new Date(info.last_error_date * 1000).toLocaleString("id-ID");
    console.log(`• Error Terakhir     : ${info.last_error_message} (${errorDate})`);
  } else {
    console.log(`• Status Error      : Tidak ada error`);
  }

  if (info.url) {
    console.log("\n✅ Webhook aktif dan siap menerima pesan!");
  } else {
    console.log("\n⚠️ Webhook belum terdaftar. Jalankan: npm run set-webhook -- https://proyek.vercel.app");
  }
} catch (error) {
  console.error(`❌ Gagal memeriksa webhook: ${error.message}`);
}
