export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const token = process.env.MTQ_TOKEN;

  try {
    const body = JSON.parse(event.body);

    // Data yang dikirim
    // {
    //   tanggal: "2025-08-09",
    //   kelas: "kelas_1",
    //   data: [ { id, nama, absensi, dari, sampai, totalJuz } ]
    // }

    // Simpan ke file database (contoh: log di console)
    console.log("Data diterima:", body);

    // Di sini nanti bisa disimpan ke repo privat seperti usermtq (misal absensi.json)
    // tapi sebagai contoh kita hanya return berhasil

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Data berhasil disimpan!" })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
