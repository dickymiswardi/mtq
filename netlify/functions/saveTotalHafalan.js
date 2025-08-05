import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;  // GitHub token dari Netlify env
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
  const rekapUrl = `https://api.github.com/repos/${repo}/contents/rekap/${kelas}_totalJuz.json`;
  const profilKelasUrl = `https://raw.githubusercontent.com/dickymiswardi/usermtq/main/${kelas}.json`;

  try {
    // Ambil profil kelas (id, nama, semester)
    const profilRes = await fetch(profilKelasUrl, { headers });
    const profilList = await profilRes.json(); // array of {id, nama, semester}

    // Buat map nama ➜ semester, dan id ➜ semester
    const namaToSemester = {};
    const idToSemester = {};
    profilList.forEach(item => {
      const smstr = parseInt(item.semester);
      if (item.nama) namaToSemester[item.nama] = smstr;
      if (item.id) idToSemester[item.id] = smstr;
    });

    // Ambil daftar file absensi
    const listRes = await fetch(absensiUrl, { headers });
    const files = await listRes.json();

    const targetFiles = files
      .filter(f => f.name.startsWith(`${kelas}_`) && f.name.endsWith(".json"))
      .sort((a, b) => a.name.localeCompare(b.name));

    const rekapMap = {};  // { tanggal: [...] }

    for (const file of targetFiles) {
      const tanggalMatch = file.name.match(/^.+_(\d{4}-\d{2}-\d{2})\.json$/);
      const tanggal = tanggalMatch ? tanggalMatch[1] : null;
      if (!tanggal) continue;

      const fileRes = await fetch(file.download_url, { headers });
      const absensiData = await fileRes.json();

      const perTanggalData = absensiData.map((entry, index) => {
        const id = entry.id || index + 1;
        const nama = entry.nama || `Santri ${id}`;
        const semester =
          idToSemester[id] || namaToSemester[nama] || null;

        return {
          id,
          nama,
          semester,
          totalJuz: parseFloat(parseFloat(entry.totalJuz || 0).toFixed(2))
        };
      });

      rekapMap[tanggal] = perTanggalData;
    }

    const finalJson = {
      kelas,
      rekap: rekapMap
    };

    // Ambil SHA jika file sudah ada
    let sha = null;
    const checkRes = await fetch(rekapUrl, { headers });
    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      sha = checkJson.sha;
    }

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
