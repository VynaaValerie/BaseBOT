import { config } from "../config.js";
import { deleteWebhook } from "../lib/telegram.js";

if (!config.botToken) {
  console.error("❌ Error: botToken belum diisi di config.js");
  process.exit(1);
}

try {
  console.log("🗑️ Menghapus pendaftaran webhook dari Telegram...");
  await deleteWebhook();
  console.log("✅ Webhook berhasil dihapus.");
} catch (error) {
  console.error(`❌ Gagal menghapus webhook: ${error.message}`);
}
