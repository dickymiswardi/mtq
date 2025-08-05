import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;  // GitHub token dari Netlify
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
  const kelasUrl = `https://raw.githubusercontent.com/${repo}/main/${kelas}.json`;
  const rekapPath = `rekap/${kelas}_totalJuz.json`;
  const rekapUrl = `https://api.github.com/repos/${repo}/contents/${rekapPath}`;

  try {
    const kelasRes = await fetch(kelasUrl, { headers });
    const kelasList = await kelasRes.json();

    const listRes = await fetch(absensiUrl, { headers });
    const files = await listRes.json();

    const targetFiles = files
      .filter(f => f.name.startsWith(`${kelas}_`) && f.name.endsWith(".json"))
      .sort((a, b) => a.name.localeCompare(b.name));

    const rekapMap = {};  // { tanggal: [data] }
    const totalSantri = {};
    const tanggalAktifMap = {};
    const allTanggal = [];

    for (const file of targetFiles) {
      const match = file.name.match(/_(\d{4}-\d{2}-\d{2})\.json$/);
      const tanggal = match ? match[1] : null;
      if (!tanggal) continue;

      allTanggal.push(tanggal);

      const res = await fetch(file.download_url, { headers });
      const absensiData = await res.json();

      const perTanggalData = absensiData.map(entry => {
        const id = entry.id || 0;
        const nama = entry.nama || "Unknown";
        const totalJuz = parseFloat(entry.totalJuz || 0);

        if (!totalSantri[id]) {
          totalSantri[id] = { id, nama, semester: null, totalJuz: 0, hariSetor: [] };
        }

        totalSantri[id].totalJuz += totalJuz;
        totalSantri[id].hariSetor.push(tanggal);

        return {
          id,
          nama,
          semester: parseInt(entry.semester) || null,
          totalJuz: parseFloat(totalJuz.toFixed(2)),
        };
      });

      rekapMap[tanggal] = perTanggalData;
    }

    // Gabungkan semester dari kelas.json
    for (const s of kelasList) {
      const id = s.id;
      if (totalSantri[id]) {
        totalSantri[id].semester = parseInt(s.semester);
      }
    }

    // Format tanggal aktif
    const formatTanggalAktif = (tanggalList) => {
      const hari = tanggalList.map(t => parseInt(t.split("-")[2])).sort((a,b) => a - b);
      const ranges = [];
      let start = hari[0], end = hari[0];

      for (let i = 1; i < hari.length; i++) {
        if (hari[i] === end + 1) {
          end = hari[i];
        } else {
          ranges.push(start === end ? `${start}` : `${start}-${end}`);
          start = end = hari[i];
        }
      }
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      return ranges.join(", ");
    };

    const santriList = Object.values(totalSantri).map(s => ({
      id: s.id,
      nama: s.nama,
      semester: s.semester,
      totalJuz: parseFloat(s.totalJuz.toFixed(2)),
      totalHari: s.hariSetor.length,
      tanggalAktif: formatTanggalAktif(s.hariSetor)
    }));

    const finalJson = {
      kelas,
      totalHari: [...new Set(allTanggal)].length,
      santri: santriList,
      rekap: rekapMap
    };

    // Cek SHA file lama
    let sha = null;
    const checkRes = await fetch(rekapUrl, { headers });
    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      sha = checkJson.sha;
    }

    const payload = {
      message: `Update total hafalan + info santri ${kelas}`,
      content: Buffer.from(JSON.stringify(finalJson, null, 2)).toString("base64"),
      sha
    };

    const saveRes = await fetch(rekapUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload)
    });

    if (!saveRes.ok) throw new Error("Gagal menyimpan rekap total");

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, file: rekapPath })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
