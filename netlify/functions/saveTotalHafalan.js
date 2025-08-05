// netlify/functions/saveTotalHafalan.js
import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const kelas = event.queryStringParameters.kelas;

  if (!kelas) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parameter 'kelas' wajib diisi" }),
    };
  }

  const repo = "dickymiswardi/usermtq";
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  const absensiUrl = `https://api.github.com/repos/${repo}/contents/absensi`;
  const kelasDataUrl = `https://raw.githubusercontent.com/dickymiswardi/usermtq/main/${kelas}.json`;
  const rekapUrl = `https://api.github.com/repos/${repo}/contents/rekap/${kelas}_totalJuz.json`;

  try {
    const kelasRes = await fetch(kelasDataUrl, { headers });
    const kelasList = await kelasRes.json();

    const listRes = await fetch(absensiUrl, { headers });
    const files = await listRes.json();

    const targetFiles = files
      .filter(f => f.name.startsWith(`${kelas}_`) && f.name.endsWith(".json"))
      .sort((a, b) => a.name.localeCompare(b.name));

    const rekapMap = {}; // { tanggal: [ {id, nama, semester, totalJuz} ] }
    const namaMap = {}; // { nama: { id, semester, totalJuzSum, tanggal[] } }

    for (const file of targetFiles) {
      const tanggalMatch = file.name.match(/_(\d{4}-\d{2}-\d{2})\.json$/);
      const tanggal = tanggalMatch ? tanggalMatch[1] : null;
      if (!tanggal) continue;

      const fileRes = await fetch(file.download_url, { headers });
      const absensiData = await fileRes.json();

      const perTanggalData = absensiData.map(entry => {
        const found = kelasList.find(k => k.id === entry.id);
        const semester = found ? parseInt(found.semester) : null;
        const nama = entry.nama || (found ? found.nama : "Unknown");

        if (!namaMap[nama]) {
          namaMap[nama] = {
            id: entry.id,
            semester,
            totalJuz: 0,
            tanggal: []
          };
        }
        const juz = parseFloat(entry.totalJuz || 0);
        namaMap[nama].totalJuz += juz;
        namaMap[nama].tanggal.push(tanggal);

        return {
          id: entry.id,
          nama,
          semester,
          totalJuz: parseFloat(juz.toFixed(2))
        };
      });

      rekapMap[tanggal] = perTanggalData;
    }

    // Format tanggal untuk setiap nama
    const allSantri = Object.entries(namaMap).map(([nama, val]) => ({
      id: val.id,
      nama,
      semester: val.semester,
      totalJuz: parseFloat(val.totalJuz.toFixed(2)),
      totalHari: val.tanggal.length,
      tanggalAktif: compressDates(val.tanggal.sort())
    }));

    const finalJson = {
      kelas,
      totalHari: Object.keys(rekapMap).length,
      santri: allSantri,
      rekap: rekapMap
    };

    // Cek apakah file sudah ada
    let sha = null;
    const checkRes = await fetch(rekapUrl, { headers });
    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      sha = checkJson.sha;
    }

    const payload = {
      message: `Update total hafalan untuk ${kelas}`,
      content: Buffer.from(JSON.stringify(finalJson, null, 2)).toString("base64"),
      sha
    };

    const saveRes = await fetch(rekapUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload)
    });

    if (!saveRes.ok) throw new Error("Gagal menyimpan file rekap");

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        file: `rekap/${kelas}_totalJuz.json`,
        totalSantri: allSantri.length
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

// Kompres tanggal berurutan jadi rentang
function compressDates(dates) {
  const result = [];
  let start = null;
  let prev = null;

  for (const dateStr of dates) {
    const date = new Date(dateStr);
    if (!start) {
      start = date;
      prev = date;
    } else {
      const diff = (date - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        prev = date;
      } else {
        result.push(formatRange(start, prev));
        start = date;
        prev = date;
      }
    }
  }
  if (start) result.push(formatRange(start, prev));
  return result.join(", ");
}

function formatRange(start, end) {
  const s = start.getDate();
  const e = end.getDate();
  return s === e ? `${s}` : `${s}-${e}`;
}
