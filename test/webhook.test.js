import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import webhook from "../api/webhook.js";
import { config } from "../config.js";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

after(() => {
  globalThis.fetch = originalFetch;
});

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function makeRequest({
  method = "POST",
  secret = config.webhookSecret,
  chatId = 1618920755,
  text = "/ping",
} = {}) {
  const req = {
    method,
    headers: {},
  };

  if (secret) {
    req.headers["x-telegram-bot-api-secret-token"] = secret;
  }

  if (method === "POST") {
    req.body = {
      message: {
        chat: { id: chatId },
        from: { first_name: "TestUser" },
        message_id: 100,
        text,
        date: Math.floor(Date.now() / 1000) - 1,
      },
    };
  }

  return req;
}

test("GET returns health check status 200", async () => {
  const res = makeResponse();
  await webhook({ method: "GET" }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.match(res.body.message, /aktif dan berjalan di Vercel/);
  assert.equal(res.body.bot, "Evalyn Bot");
});

test("rejects unauthorized POST without valid secret token", async () => {
  const res = makeResponse();
  await webhook(makeRequest({ secret: "wrong_secret" }), res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.ok, false);
});

test("handles /ping command and replies with status and latency", async () => {
  let sentPayload = null;
  globalThis.fetch = async (url, options) => {
    if (url.includes("/sendMessage")) {
      sentPayload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ok: true, result: {} }) };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  };

  const res = makeResponse();
  await webhook(makeRequest({ text: "/ping" }), res);

  assert.equal(res.statusCode, 200);
  assert.ok(sentPayload);
  assert.equal(sentPayload.chat_id, 1618920755);
  assert.match(sentPayload.text, /PONG!/);
  assert.match(sentPayload.text, /👑 Owner/);
});

test("handles /start command with welcome menu", async () => {
  let sentPayload = null;
  globalThis.fetch = async (url, options) => {
    if (url.includes("/sendMessage")) {
      sentPayload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ok: true, result: {} }) };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  };

  const res = makeResponse();
  await webhook(makeRequest({ text: "/start" }), res);

  assert.equal(res.statusCode, 200);
  assert.ok(sentPayload);
  assert.match(sentPayload.text, /Halo, TestUser!/);
  assert.match(sentPayload.text, /\/cari/);
});

test("handles /help command", async () => {
  let sentPayload = null;
  globalThis.fetch = async (url, options) => {
    if (url.includes("/sendMessage")) {
      sentPayload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ok: true, result: {} }) };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  };

  const res = makeResponse();
  await webhook(makeRequest({ text: "/help" }), res);

  assert.equal(res.statusCode, 200);
  assert.ok(sentPayload);
  assert.match(sentPayload.text, /Panduan Penggunaan/);
});

test("handles /cari command with internet search results", async () => {
  const sentMessages = [];
  globalThis.fetch = async (url, options) => {
    if (url.includes("/sendMessage")) {
      sentMessages.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ ok: true, result: {} }) };
    }
    if (url.includes("/sendChatAction")) {
      return { ok: true, json: async () => ({ ok: true, result: {} }) };
    }
    if (url.includes("duckduckgo.com")) {
      return {
        ok: true,
        text: async () => `
          <div class="result results_links">
            <h2 class="result__title"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com">Example Search Result</a></h2>
            <a class="result__snippet">Contoh cuplikan ringkasan pencarian internet.</a>
          </div>
        `,
      };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  };

  const res = makeResponse();
  await webhook(makeRequest({ text: "/cari resep kue bolu" }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0].text, /Hasil Pencarian untuk:/);
  assert.match(sentMessages[0].text, /Example Search Result/);
});

test("handles /cuaca command", async () => {
  let sentPayload = null;
  globalThis.fetch = async (url, options) => {
    if (url.includes("wttr.in")) {
      return {
        ok: true,
        json: async () => ({
          current_condition: [{ temp_C: "29", FeelsLikeC: "32", weatherDesc: [{ value: "Sunny" }], humidity: "65", windspeedKmph: "12" }],
          nearest_area: [{ areaName: [{ value: "Bandung" }], country: [{ value: "Indonesia" }] }],
        }),
      };
    }
    if (url.includes("/sendMessage")) {
      sentPayload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ok: true, result: {} }) };
    }
    return { ok: true, json: async () => ({ ok: true, result: {} }) };
  };

  const res = makeResponse();
  await webhook(makeRequest({ text: "/cuaca Bandung" }), res);

  assert.equal(res.statusCode, 200);
  assert.ok(sentPayload);
  assert.match(sentPayload.text, /Prakiraan Cuaca: Bandung, Indonesia/);
  assert.match(sentPayload.text, /29°C/);
});

test("handles /gempa command from BMKG", async () => {
  let sentPayload = null;
  globalThis.fetch = async (url, options) => {
    if (url.includes("bmkg.go.id")) {
      return {
        ok: true,
        json: async () => ({
          Infogempa: {
            gempa: {
              Tanggal: "17 Okt 2026",
              Jam: "12:00:00 WIB",
              Magnitude: "5.2",
              Kedalaman: "10 km",
              Wilayah: "Barat Daya Pangandaran",
              Potensi: "Tidak berpotensi tsunami",
              Lintang: "7.8 LS",
              Bujur: "108.5 BT",
            },
          },
        }),
      };
    }
    if (url.includes("/sendMessage")) {
      sentPayload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ok: true, result: {} }) };
    }
    return { ok: true, json: async () => ({ ok: true, result: {} }) };
  };

  const res = makeResponse();
  await webhook(makeRequest({ text: "/gempa" }), res);

  assert.equal(res.statusCode, 200);
  assert.ok(sentPayload);
  assert.match(sentPayload.text, /Info Gempa Terkini \(BMKG\)/);
  assert.match(sentPayload.text, /Barat Daya Pangandaran/);
  assert.match(sentPayload.text, /5.2 SR/);
});
