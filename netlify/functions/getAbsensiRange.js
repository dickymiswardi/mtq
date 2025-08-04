import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const { kelas, start, end } = event.queryStringParameters;

  if (!kelas || !start || !end) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parameter 'kelas', 'start', dan 'end' wajib diisi" }),
    };
  }

  // Fungsi bantu untuk buat daftar tanggal antara start dan end
  function generateDateRange(startDate, endDate) {
    const dates = [];
    let current = new Date(startDate);
    const endD = new Date(endDate);
    while (current <= endD) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  const tanggalList = generateDateRange(start, end);
  const hasilGabungan = [];

  for (const tanggal of tanggalList) {
    const fileName = `${kelas}_${tanggal}.json`;
    const url = `https://raw.githubusercontent.com/dickymiswardi/usermtq/main/absensi/${fileName}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 404) continue;

      if (!response.ok) {
        throw new Error(`Gagal fetch: ${response.status}`);
      }

      const data = await response.json();
      hasilGabungan.push(...data);
    } catch (err) {
      console.error(`Gagal ambil data untuk ${tanggal}:`, err.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(hasilGabungan),
  };
}
