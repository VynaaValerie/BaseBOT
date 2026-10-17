/**
 * Modul Pencarian Informasi Internet & API Terbuka
 * Ringan, cepat, tanpa dependensi eksternal (menggunakan native fetch).
 */

/**
 * Mencari informasi di internet via DuckDuckGo dengan fallback ke Wikipedia
 */
export async function searchInternet(query, maxResults = 3) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, error: "Kata kunci pencarian tidak boleh kosong." };
  }

  // 1. Coba DuckDuckGo HTML Search
  try {
    const res = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(trimmed), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const html = await res.text();
      const blocks = html.split(/class="result\s+results_links/g);
      const results = [];

      for (let i = 1; i < blocks.length && results.length < maxResults; i++) {
        const b = blocks[i];
        const titleMatch = b.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = b.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
        const hrefMatch = b.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"/i);

        if (titleMatch && snippetMatch) {
          let url = "";
          if (hrefMatch) {
            const uMatch = hrefMatch[1].match(/uddg=([^&]+)/);
            url = uMatch ? decodeURIComponent(uMatch[1]) : hrefMatch[1];
          }

          results.push({
            title: titleMatch[1].replace(/<[^>]+>/g, "").trim(),
            snippet: snippetMatch[1].replace(/<[^>]+>/g, "").trim(),
            url: url.startsWith("//") ? `https:${url}` : url,
          });
        }
      }

      if (results.length > 0) {
        return { ok: true, source: "DuckDuckGo Web Search", results };
      }
    }
  } catch {
    // Lanjut ke fallback jika gagal
  }

  // 2. Fallback ke Wikipedia Search API
  try {
    const wikiSearchRes = await fetch(
      `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(trimmed)}&utf8=&format=json`,
      {
        headers: { "User-Agent": "TelegramBot/1.0" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (wikiSearchRes.ok) {
      const wikiData = await wikiSearchRes.json();
      const hits = wikiData.query?.search || [];

      if (hits.length > 0) {
        const results = hits.slice(0, maxResults).map((hit) => ({
          title: hit.title,
          snippet: hit.snippet.replace(/<[^>]+>/g, "").trim(),
          url: `https://id.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
        }));

        return { ok: true, source: "Wikipedia Indonesia", results };
      }
    }
  } catch {
    // Lanjut ke fallback berikutnya jika gagal
  }

  // 3. Fallback ke DuckDuckGo Instant Answer API
  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmed)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (ddgRes.ok) {
      const ddg = await ddgRes.json();
      if (ddg.AbstractText) {
        return {
          ok: true,
          source: ddg.AbstractSource || "DuckDuckGo",
          results: [
            {
              title: ddg.Heading || trimmed,
              snippet: ddg.AbstractText,
              url: ddg.AbstractURL || "",
            },
          ],
        };
      }
    }
  } catch {
    // Semua fallback gagal
  }

  return {
    ok: false,
    error: `Tidak menemukan informasi untuk "${trimmed}". Coba kata kunci yang lebih spesifik.`,
  };
}

/**
 * Mencari ringkasan artikel di Wikipedia (Bahasa Indonesia dengan fallback Inggris)
 */
export async function searchWikipedia(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Topik pencarian Wikipedia tidak boleh kosong.");
  }

  // 1. Coba langsung ringkasan Wikipedia Bahasa Indonesia
  try {
    const resId = await fetch(
      `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(trimmed)}`,
      {
        headers: { "User-Agent": "TelegramBot/1.0" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (resId.ok) {
      const data = await resId.json();
      if (data.extract) {
        return {
          title: data.title,
          description: data.description || "",
          extract: data.extract,
          url: data.content_urls?.desktop?.page || `https://id.wikipedia.org/wiki/${encodeURIComponent(trimmed)}`,
          lang: "id",
        };
      }
    }
  } catch {}

  // 2. Jika judul langsung tidak ada, gunakan fitur search Wikipedia ID
  try {
    const searchRes = await fetch(
      `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(trimmed)}&utf8=&format=json`,
      {
        headers: { "User-Agent": "TelegramBot/1.0" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (searchRes.ok) {
      const sData = await searchRes.json();
      const firstHit = sData.query?.search?.[0];

      if (firstHit) {
        const hitRes = await fetch(
          `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstHit.title)}`,
          {
            headers: { "User-Agent": "TelegramBot/1.0" },
            signal: AbortSignal.timeout(5000),
          }
        );

        if (hitRes.ok) {
          const hitData = await hitRes.json();
          return {
            title: hitData.title,
            description: hitData.description || "",
            extract: hitData.extract || firstHit.snippet.replace(/<[^>]+>/g, ""),
            url: hitData.content_urls?.desktop?.page || `https://id.wikipedia.org/wiki/${encodeURIComponent(firstHit.title)}`,
            lang: "id",
          };
        }
      }
    }
  } catch {}

  // 3. Fallback ke Wikipedia Bahasa Inggris
  try {
    const resEn = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(trimmed)}`,
      {
        headers: { "User-Agent": "TelegramBot/1.0" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (resEn.ok) {
      const data = await resEn.json();
      if (data.extract) {
        return {
          title: data.title,
          description: data.description || "",
          extract: data.extract,
          url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(trimmed)}`,
          lang: "en",
        };
      }
    }
  } catch {}

  throw new Error(`Artikel "${trimmed}" tidak ditemukan di Wikipedia.`);
}

/**
 * Mengambil informasi cuaca berdasarkan nama kota (via wttr.in)
 */
export async function getWeather(city = "Jakarta") {
  const trimmed = city.trim() || "Jakarta";
  const url = `https://wttr.in/${encodeURIComponent(trimmed)}?format=j1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "curl/7.68.0" },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    throw new Error(`Gagal mengambil data cuaca untuk "${trimmed}".`);
  }

  const data = await res.json();
  const current = data.current_condition?.[0];
  const area = data.nearest_area?.[0];

  const cityName = area?.areaName?.[0]?.value || trimmed;
  const country = area?.country?.[0]?.value || "";

  return {
    location: country ? `${cityName}, ${country}` : cityName,
    tempC: current?.temp_C || "N/A",
    feelsLikeC: current?.FeelsLikeC || "N/A",
    condition: current?.weatherDesc?.[0]?.value || "Tidak diketahui",
    humidity: current?.humidity || "N/A",
    windKmph: current?.windspeedKmph || "N/A",
  };
}

/**
 * Mengambil informasi gempa bumi terkini dari BMKG Indonesia
 */
export async function getLatestEarthquake() {
  const res = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json", {
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    throw new Error("Gagal mengambil data dari BMKG.");
  }

  const data = await res.json();
  const gempa = data.Infogempa?.gempa;

  if (!gempa) {
    throw new Error("Format data BMKG tidak sesuai.");
  }

  return gempa;
}
