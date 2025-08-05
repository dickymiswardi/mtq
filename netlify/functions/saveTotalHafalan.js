import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;  // token GitHub dari Netlify
  const kelas = event.queryStringParameters.kelas;

  if (!kelas) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parameter 'kelas' wajib diisi" }),
    };
  }

  const repo = "dickymiswardi/usermtq"; // nama repo GitHub privat
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  const absensiUrl = `https://api.github.com/repos/${repo}/contents/absensi`;
  const rekapUrl = `https://api.github.com/repos/${repo}/contents/rekap/${kelas}_totalJuz.json`;

  try {
    // Ambil semua file absensi untuk kelas ini
    const listRes = await fetch(absensiUrl, { headers });
    const files = await listRes.json();

    const targetFiles = files
      .filter(f => f.name.startsWith(`${kelas}_`) && f.name.endsWith(".json"))
      .sort((a, b) => a.name.localeCompare(b.name)); // urut berdasarkan tanggal

    const rekapMap = {}; // { tanggal: [ {id, nama, semester, totalJuz} ] }

    for (const file of targetFiles) {
      const tanggalMatch = file.name.match(/^.+_(\d{4}-\d{2}-\d{2})\.json$/);
      const tanggal = tanggalMatch ? tanggalMatch[1] : null;
      if (!tanggal) continue;

      const fileRes = await fetch(file.download_url, { headers });
      const absensiData = await fileRes.json();

      const perTanggalData = absensiData.map((entry, index) => ({
  id: typeof entry.id === "number" && entry.id > 0 ? entry.id : index + 1,
  nama: entry.nama || `Santri ${index + 1}`,
  semester: entry.semester ? parseInt(entry.semester) : null,
  totalJuz: entry.totalJuz ? parseFloat(parseFloat(entry.totalJuz).toFixed(2)) : 0
}));

      rekapMap[tanggal] = perTanggalData;
    }

    const finalJson = {
      kelas,
      rekap: rekapMap
    };

    // Cek apakah file sudah ada
    let sha = null;
    const checkRes = await fetch(rekapUrl, { headers });
    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      sha = checkJson.sha;
    }

    // Simpan file ke GitHub (rekap)
    const payload = {
      message: `Update total hafalan per tanggal untuk ${kelas}`,
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
        totalTanggal: Object.keys(rekapMap).length
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
