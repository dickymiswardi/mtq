import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const quranUrl = "https://api.github.com/repos/dickymiswardi/usermtq/contents/quran.json";
  const pagesUrl = "https://api.github.com/repos/dickymiswardi/usermtq/contents/getPagesMap.json";

  // Ambil parameter from dan to dari query string
  const from = event.queryStringParameters?.from;
  const to = event.queryStringParameters?.to;

  if (!from || !to) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parameter 'from' dan 'to' wajib diisi, contoh: from=1:1&to=2:3" }),
    };
  }

  try {
    // Fetch quran.json
    const quranResp = await fetch(quranUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!quranResp.ok) throw new Error(`Gagal fetch quran.json: ${quranResp.status}`);
    const quranData = await quranResp.json();
    const quran = JSON.parse(Buffer.from(quranData.content, "base64").toString("utf-8"));

    // Fetch pagesMap.json
    const pagesResp = await fetch(pagesUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!pagesResp.ok) throw new Error(`Gagal fetch getPagesMap.json: ${pagesResp.status}`);
    const pagesData = await pagesResp.json();
    const pagesMap = JSON.parse(Buffer.from(pagesData.content, "base64").toString("utf-8"));

    // Fungsi bantu parsing surah:ayat jadi angka [surah, ayat]
    const parseKey = (key) => {
      const [s, a] = key.split(":").map(Number);
      return { s, a };
    };

    // Bandingkan posisi dua kunci (surah:ayat)
    function compareKeys(k1, k2) {
      if (k1.s < k2.s) return -1;
      if (k1.s > k2.s) return 1;
      if (k1.a < k2.a) return -1;
      if (k1.a > k2.a) return 1;
      return 0;
    }

    const fromKey = parseKey(from);
    const toKey = parseKey(to);

    // Filter ayat yang masuk rentang
    const selectedAyat = Object.keys(quran)
      .filter((key) => {
        const k = parseKey(key);
        return compareKeys(k, fromKey) >= 0 && compareKeys(k, toKey) <= 0;
      })
      .sort((a, b) => {
        const ka = parseKey(a);
        const kb = parseKey(b);
        return compareKeys(ka, kb);
      });

    // Buat output lengkap: [{ key: "1:1", text: "...", page: 1 }, ...]
    const result = selectedAyat.map((key) => ({
      key,
      text: quran[key],
      page: pagesMap[key] || null,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
}
