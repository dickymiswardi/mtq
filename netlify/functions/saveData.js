// netlify/functions/saveData.js
import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { tanggal, kelas, data } = JSON.parse(event.body);

    if (!tanggal || !kelas || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Data tidak lengkap" }),
      };
    }

    // Nama file unik berdasarkan kelas dan tanggal
    const fileName = `${kelas}_${tanggal}.json`;
    const url = `https://api.github.com/repos/dickymiswardi/usermtq/contents/absensi/${fileName}`;

    // Cek apakah file sudah ada di repo
    const existing = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" }
    });

    let sha = null;
    if (existing.status === 200) {
      const json = await existing.json();
      sha = json.sha;
    }

    // Simpan data ke GitHub repo privat
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: `Update data absensi ${kelas} tanggal ${tanggal}`,
        content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
        sha: sha || undefined,
      }),
    });

    if (!res.ok) {
      throw new Error(`Gagal menyimpan data: ${res.status}`);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
