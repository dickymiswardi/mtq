export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const kelas = event.queryStringParameters.kelas;
  const tanggal = event.queryStringParameters.tanggal;

  if (!kelas || !tanggal) {
    return { statusCode: 400, body: JSON.stringify({ error: "kelas dan tanggal wajib diisi" }) };
  }

  const url = `https://github.com/dickymiswardi/usermtq/raw/refs/heads/main/absensi/${kelas}_${tanggal}.json`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 404) {
      // jika belum ada file, kirim array kosong
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    if (!res.ok) throw new Error(`Gagal fetch absensi: ${res.status}`);

    // baca isi file
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }

    // kalau bukan array, paksa jadi array
    if (!Array.isArray(data)) {
      data = [];
    }

    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
