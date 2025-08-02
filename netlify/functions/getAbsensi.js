export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const kelas = event.queryStringParameters.kelas;
  const tanggal = event.queryStringParameters.tanggal;

  if (!kelas || !tanggal) {
    return { statusCode: 400, body: "kelas dan tanggal wajib diisi" };
  }

  const url = `https://github.com/dickymiswardi/usermtq/raw/refs/heads/main/absensi/${kelas}_${tanggal}.json`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    if (!res.ok) throw new Error(`Gagal fetch absensi: ${res.status}`);

    const data = await res.text();
    return { statusCode: 200, body: data };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
