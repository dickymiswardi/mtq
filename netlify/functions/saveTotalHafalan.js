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
  const rekapUrl = `https://api.github.com/repos/${repo}/contents/rekap/${kelas}_totalJuz.json`;
  const kelasUrl = `https://raw.githubusercontent.com/${repo}/main/${kelas}.json`;

  try {
    const kelasRes = await fetch(kelasUrl, { headers });
    const kelasData = await kelasRes.json();

    const listRes = await fetch(absensiUrl, { headers });
    const files = await listRes.json();

    const targetFiles = files
      .filter(f => f.name.startsWith(`${kelas}_`) && f.name.endsWith(".json"))
      .sort((a, b) => a.name.localeCompare(b.name));

    const rekapMap = {}; // { tanggal: [ {id, nama, semester, totalJuz} ] }

    for (const file of targetFiles) {
      const tanggalMatch = file.name.match(/^.+_(\d{4}-\d{2}-\d{2})\.json$/);
      const tanggal = tanggalMatch ? tanggalMatch[1] : null;
      if (!tanggal) continue;

      const fileRes = await fetch(file.download_url, { headers });
      const absensiData = await fileRes.json();

      const perTanggalData = absensiData.map(entry => {
        const info = kelasData.find(k => k.nama === entry.nama);
        return {
          id: info ? info.id : 0,
          nama: entry.nama,
          semester: info ? parseInt(info.semester) : null,
          totalJuz: parseFloat(parseFloat(entry.totalJuz || 0).toFixed(2))
        };
      });

      rekapMap[tanggal] = perTanggalData;
    }

    // Hitung total per semester
    const semesterTotals = {};
    const namaSemesterMap = {}; // nama => semester

    for (const tanggal in rekapMap) {
      for (const entry of rekapMap[tanggal]) {
        const semester = entry.semester;
        if (!semester) continue;

        if (!semesterTotals[semester]) {
          semesterTotals[semester] = 0;
        }

        semesterTotals[semester] += entry.totalJuz;
        namaSemesterMap[entry.nama] = semester; // fallback map
      }
    }

    // Bulatkan total dan buat array
    const totalPerSemester = Object.keys(semesterTotals).map(sem => ({
      semester: parseInt(sem),
      totalJuz: parseFloat(semesterTotals[sem].toFixed(2))
    }));

    const finalJson = {
      kelas,
      totalHari: Object.keys(rekapMap).length,
      totalPerSemester,
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
      message: `Update total hafalan per tanggal & semester untuk ${kelas}`,
      content: Buffer.from(JSON.stringify(finalJson, null, 2)).toString("base64"),
      sha
    };

    const saveRes = await fetch(rekapUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload)
    });

    if (!saveRes.ok) throw new Error("Gagal menyimpan file rekap baru");

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        file: `rekap/${kelas}_totalJuz.json`,
        totalHari: finalJson.totalHari,
        totalPerSemester
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
