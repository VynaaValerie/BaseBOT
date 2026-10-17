import { config } from "../config.js";
import { matchesSecret, sendMessage, sendChatAction, escapeHtml } from "../lib/telegram.js";
import { searchInternet, searchWikipedia, getWeather, getLatestEarthquake } from "../lib/search.js";

/**
 * Handler Webhook Telegram untuk Vercel Serverless
 */
export default async function webhook(req, res) {
  // 1. Tangani GET Request (Status / Health Check)
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: `${config.botName || "Telegram Bot"} aktif dan berjalan di Vercel!`,
      bot: config.botName,
      ownerConfigured: Boolean(config.ownerChatId),
      runtime: `Node.js ${process.version}`,
      platform: "Vercel Serverless",
      timestamp: new Date().toISOString(),
    });
  }

  // Hanya terima POST untuk webhook update Telegram
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // 2. Validasi Secret Token Webhook
  const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
  if (config.webhookSecret && !matchesSecret(secretHeader, config.webhookSecret)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  // 3. Parsing Body Request
  let update = req.body;
  if (typeof update === "string") {
    try {
      update = JSON.parse(update);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid JSON" });
    }
  }

  const message = update?.message;
  // Abaikan update selain pesan teks baru (misal edit, channel post, reaksi)
  if (!message || !message.text) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const messageId = message.message_id;
  const isOwner = String(chatId) === String(config.ownerChatId);

  // Jika opsi onlyOwner aktif, abaikan pesan dari orang lain
  if (config.onlyOwner && !isOwner) {
    return res.status(200).json({ ok: true });
  }

  const rawText = message.text.trim();
  const isCommand = rawText.startsWith("/");
  let command = "";
  let query = "";

  if (isCommand) {
    const parts = rawText.split(/\s+/);
    command = (parts[0] || "").toLowerCase().split("@")[0];
    query = parts.slice(1).join(" ").trim();
  } else {
    query = rawText;
  }

  try {
    // 4. Router Perintah
    switch (command) {
      case "/start": {
        const welcomeText =
          `👋 <b>Halo, ${escapeHtml(message.from?.first_name || "Sobat")}!</b>\n\n` +
          `Selamat datang di <b>${escapeHtml(config.botName)}</b> 🤖\n` +
          `Bot Telegram cepat & ringan berbasis Node.js yang berjalan di Vercel.\n\n` +
          `📌 <b>Daftar Perintah:</b>\n` +
          `• <code>/ping</code> - Cek kecepatan respon & info sistem\n` +
          `• <code>/cari &lt;pertanyaan/topik&gt;</code> - Cari informasi dari internet\n` +
          `• <code>/wiki &lt;topik&gt;</code> - Cari ringkasan artikel di Wikipedia\n` +
          `• <code>/cuaca &lt;kota&gt;</code> - Cek ramalan cuaca (contoh: <code>/cuaca Jakarta</code>)\n` +
          `• <code>/gempa</code> - Info gempa bumi terkini (BMKG)\n` +
          `• <code>/help</code> - Tampilkan bantuan ini\n\n` +
          `💡 <i>Tips: Kamu juga bisa langsung ketik pertanyaan apa saja di chat, bot akan otomatis mencarikan jawabannya di internet!</i>`;

        await sendMessage(chatId, welcomeText, { replyToMessageId: messageId });
        break;
      }

      case "/help":
      case "/menu": {
        const helpText =
          `📖 <b>Panduan Penggunaan ${escapeHtml(config.botName)}:</b>\n\n` +
          `🔍 <b>Pencarian Internet:</b>\n` +
          `• <code>/cari siapa presiden indonesia</code>\n` +
          `• <code>/cari resep nasi goreng enak</code>\n\n` +
          `📚 <b>Wikipedia:</b>\n` +
          `• <code>/wiki Albert Einstein</code>\n` +
          `• <code>/wiki Kecerdasan buatan</code>\n\n` +
          `🌤️ <b>Cuaca:</b>\n` +
          `• <code>/cuaca Surabaya</code>\n` +
          `• <code>/cuaca Tokyo</code>\n\n` +
          `🚨 <b>Gempa BMKG:</b>\n` +
          `• <code>/gempa</code>\n\n` +
          `⚡ <b>Sistem:</b>\n` +
          `• <code>/ping</code> - Cek status bot & latensi`;

        await sendMessage(chatId, helpText, { replyToMessageId: messageId });
        break;
      }

      case "/ping": {
        const now = Date.now();
        const msgTime = message.date ? message.date * 1000 : now;
        const latency = Math.max(0, now - msgTime);
        const uptimeSec = Math.floor(process.uptime());
        const hours = Math.floor(uptimeSec / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        const seconds = uptimeSec % 60;

        const pingText =
          `🏓 <b>PONG!</b>\n\n` +
          `⏱️ <b>Latensi:</b> ~${latency} ms\n` +
          `⏳ <b>Uptime:</b> ${hours}j ${minutes}m ${seconds}s\n` +
          `📦 <b>Runtime:</b> ${process.version}\n` +
          `⚡ <b>Platform:</b> Vercel Serverless\n` +
          `👤 <b>Pengirim:</b> ${isOwner ? "👑 Owner" : "👥 User"}\n\n` +
          `<i>${escapeHtml(config.pingReplyText)}</i>`;

        await sendMessage(chatId, pingText, { replyToMessageId: messageId });
        break;
      }

      case "/cari":
      case "/search": {
        if (!query) {
          await sendMessage(
            chatId,
            `⚠️ Masukkan kata kunci pencarian.\nContoh: <code>/cari siapa penemu internet</code>`,
            { replyToMessageId: messageId }
          );
          break;
        }

        await sendChatAction(chatId, "typing");
        const searchRes = await searchInternet(query);

        if (!searchRes.ok || !searchRes.results?.length) {
          await sendMessage(
            chatId,
            `❌ ${escapeHtml(searchRes.error || "Informasi tidak ditemukan.")}`,
            { replyToMessageId: messageId }
          );
          break;
        }

        let reply = `🔍 <b>Hasil Pencarian untuk:</b> <i>"${escapeHtml(query)}"</i>\n\n`;
        searchRes.results.forEach((item, index) => {
          reply += `${index + 1}. <a href="${item.url}"><b>${escapeHtml(item.title)}</b></a>\n`;
          reply += `${escapeHtml(item.snippet)}\n\n`;
        });
        reply += `🌐 <i>Sumber: ${escapeHtml(searchRes.source || "Internet")}</i>`;

        await sendMessage(chatId, reply, { replyToMessageId: messageId, disableWebPagePreview: true });
        break;
      }

      case "/wiki": {
        if (!query) {
          await sendMessage(
            chatId,
            `⚠️ Masukkan topik yang ingin dicari di Wikipedia.\nContoh: <code>/wiki Artificial Intelligence</code>`,
            { replyToMessageId: messageId }
          );
          break;
        }

        await sendChatAction(chatId, "typing");
        try {
          const wiki = await searchWikipedia(query);
          let reply = `📚 <b>${escapeHtml(wiki.title)}</b>\n`;
          if (wiki.description) {
            reply += `<i>${escapeHtml(wiki.description)}</i>\n\n`;
          }
          reply += `${escapeHtml(wiki.extract)}\n\n`;
          if (wiki.url) {
            reply += `🔗 <a href="${wiki.url}">Baca artikel selengkapnya di Wikipedia</a>`;
          }

          await sendMessage(chatId, reply, { replyToMessageId: messageId });
        } catch (err) {
          await sendMessage(chatId, `❌ ${escapeHtml(err.message)}`, { replyToMessageId: messageId });
        }
        break;
      }

      case "/cuaca": {
        const city = query || "Jakarta";
        await sendChatAction(chatId, "typing");

        try {
          const weather = await getWeather(city);
          const reply =
            `🌤️ <b>Prakiraan Cuaca: ${escapeHtml(weather.location)}</b>\n\n` +
            `🌡️ <b>Suhu:</b> ${weather.tempC}°C (Terasa: ${weather.feelsLikeC}°C)\n` +
            `☁️ <b>Kondisi:</b> ${escapeHtml(weather.condition)}\n` +
            `💧 <b>Kelembaban:</b> ${weather.humidity}%\n` +
            `💨 <b>Angin:</b> ${weather.windKmph} km/jam`;

          await sendMessage(chatId, reply, { replyToMessageId: messageId });
        } catch (err) {
          await sendMessage(chatId, `❌ ${escapeHtml(err.message)}`, { replyToMessageId: messageId });
        }
        break;
      }

      case "/gempa": {
        await sendChatAction(chatId, "typing");

        try {
          const gempa = await getLatestEarthquake();
          let reply =
            `🚨 <b>Info Gempa Terkini (BMKG)</b>\n\n` +
            `📍 <b>Lokasi:</b> ${escapeHtml(gempa.Wilayah)}\n` +
            `💥 <b>Magnitudo:</b> ${escapeHtml(gempa.Magnitude)} SR\n` +
            `📏 <b>Kedalaman:</b> ${escapeHtml(gempa.Kedalaman)}\n` +
            `🕒 <b>Waktu:</b> ${escapeHtml(gempa.Tanggal)} - ${escapeHtml(gempa.Jam)}\n` +
            `🌐 <b>Koordinat:</b> ${escapeHtml(gempa.Lintang)} - ${escapeHtml(gempa.Bujur)}\n` +
            `⚠️ <b>Potensi:</b> ${escapeHtml(gempa.Potensi)}\n`;

          if (gempa.Dirasakan) {
            reply += `👥 <b>Dirasakan:</b> ${escapeHtml(gempa.Dirasakan)}\n`;
          }

          await sendMessage(chatId, reply, { replyToMessageId: messageId });
        } catch (err) {
          await sendMessage(chatId, `❌ ${escapeHtml(err.message)}`, { replyToMessageId: messageId });
        }
        break;
      }

      default: {
        if (isCommand) {
          // Perintah / tidak dikenal
          await sendMessage(
            chatId,
            `❓ Perintah tidak dikenali. Ketik /help untuk melihat menu perintah yang tersedia.`,
            { replyToMessageId: messageId }
          );
        } else if (config.autoSearchOnText) {
          // Teks biasa dari pengguna -> langsung carikan di internet
          await sendChatAction(chatId, "typing");
          const searchRes = await searchInternet(query);

          if (searchRes.ok && searchRes.results?.length > 0) {
            let reply = `🔍 <b>Informasi yang ditemukan untuk:</b> <i>"${escapeHtml(query)}"</i>\n\n`;
            searchRes.results.forEach((item, index) => {
              reply += `${index + 1}. <a href="${item.url}"><b>${escapeHtml(item.title)}</b></a>\n`;
              reply += `${escapeHtml(item.snippet)}\n\n`;
            });
            reply += `🌐 <i>Sumber: ${escapeHtml(searchRes.source || "Internet")}</i>\n\n`;
            reply += `💡 <i>Ketik /help untuk menu bantuan lainnya.</i>`;

            await sendMessage(chatId, reply, { replyToMessageId: messageId, disableWebPagePreview: true });
          } else {
            await sendMessage(
              chatId,
              `🤖 Halo! Ada yang bisa saya bantu?\nKetik <code>/help</code> untuk melihat daftar perintah atau <code>/cari &lt;topik&gt;</code> untuk mencari info.`,
              { replyToMessageId: messageId }
            );
          }
        }
        break;
      }
    }
  } catch (error) {
    // Tangani error tanpa mengekspos token
    console.error("Webhook processing error:", error.message);
  }

  return res.status(200).json({ ok: true });
}
