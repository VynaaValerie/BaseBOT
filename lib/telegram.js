import { timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

/**
 * Escape string untuk format HTML Telegram
 */
export function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Validasi token rahasia webhook menggunakan timingSafeEqual untuk mencegah timing attack
 */
export function matchesSecret(received, expected) {
  if (!expected) return true;
  if (typeof received !== "string" || typeof expected !== "string") {
    return false;
  }

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length > 0 &&
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

/**
 * Panggilan dasar ke Telegram Bot API
 */
export async function telegramFetch(method, payload = {}, timeoutMs = 8000) {
  const token = config.botToken;
  if (!token) {
    throw new Error("Bot token belum diatur di config.js");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API ${method} failed`);
  }

  return data.result;
}

/**
 * Mengirim pesan teks ke chat Telegram
 */
export async function sendMessage(chatId, text, { replyToMessageId, parseMode = "HTML", disableWebPagePreview = false } = {}) {
  // Telegram memiliki batas maksimal 4096 karakter per pesan
  const safeText = text.length > 4000 ? text.slice(0, 3990) + "\n...[Dipotong karena terlalu panjang]" : text;

  const payload = {
    chat_id: chatId,
    text: safeText,
    parse_mode: parseMode,
    disable_web_page_preview: disableWebPagePreview,
  };

  if (replyToMessageId) {
    payload.reply_parameters = { message_id: replyToMessageId };
  }

  return telegramFetch("sendMessage", payload);
}

/**
 * Menampilkan status "mengetik..." di Telegram chat
 */
export async function sendChatAction(chatId, action = "typing") {
  try {
    return await telegramFetch("sendChatAction", { chat_id: chatId, action }, 3000);
  } catch {
    // Non-kritis, abaikan jika gagal
    return null;
  }
}

/**
 * Daftarkan Webhook ke Telegram
 */
export async function setWebhook(url, secretToken = config.webhookSecret) {
  const payload = {
    url,
    allowed_updates: ["message"],
  };

  if (secretToken) {
    payload.secret_token = secretToken;
  }

  return telegramFetch("setWebhook", payload, 10000);
}

/**
 * Dapatkan informasi status webhook saat ini
 */
export async function getWebhookInfo() {
  return telegramFetch("getWebhookInfo", {}, 5000);
}

/**
 * Hapus pendaftaran webhook dari Telegram
 */
export async function deleteWebhook() {
  return telegramFetch("deleteWebhook", {}, 5000);
}
