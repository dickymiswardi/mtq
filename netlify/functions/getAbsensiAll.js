// netlify/functions/getAbsensiAll.js
import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const { kelas } = event.queryStringParameters;

  if (!kelas) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parameter 'kelas' wajib diisi" }),
    };
  }

  const url = `https://raw.githubusercontent.com/dickymiswardi/usermtq/main/absensi/${kelas}.json`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) {
      return { statusCode: 200, body: JSON.stringify([]) }; // Kosong jika belum ada
    }

    if (!response.ok) {
      throw new Error(`Gagal mengambil data: ${response.status}`);
    }

    const data = await response.text();
    return { statusCode: 200, body: data };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
