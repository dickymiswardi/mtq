export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const kelas = event.queryStringParameters.kelas;
  const tanggal = event.queryStringParameters.tanggal;

  if (!kelas || !tanggal) {
    return { statusCode: 400, body: "kelas dan tanggal wajib diisi" };
  }

  // File absensi: absensi/kelas_1_2025-08-02.json
  const url = `https://github.com/dickymiswardi/usermtq/raw/refs/heads/main/absensi/${kelas}_${tanggal}.json`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Kalau belum ada file absensi, kembalikan data kosong
    if (res.status === 404) {
      // generate default data berdasarkan daftar santri
      const santriRes = await fetch(`https://github.com/dickymiswardi/usermtq/raw/refs/heads/main/${kelas}.json`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const santriData = await santriRes.json();

      const defaultData = santriData.map(s => ({
        id: s.id,
        nama: s.nama,
        absensi: "Hadir",
        dari: "",
        sampai: "",
        totalJuz: "0"
      }));

      return { statusCode: 200, body: JSON.stringify(defaultData) };
    }

    if (!res.ok) throw new Error(`Gagal fetch absensi: ${res.status}`);

    const data = await res.text();
    return { statusCode: 200, body: data };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
