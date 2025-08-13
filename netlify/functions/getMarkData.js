// netlify/functions/getMarkData.js
import fetch from 'node-fetch';

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const { kelas, tanggal } = event.queryStringParameters || {};

  if (!kelas || !tanggal) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parameter 'kelas' dan 'tanggal' wajib diisi" })
    };
  }

  // Nama file sesuai format GitHub repo
  const filePath = `absensi/kelas_${kelas}_${tanggal}.json`;
  const apiUrl = `https://api.github.com/repos/dickymiswardi/usermtq/contents/${filePath}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Gagal fetch data: ${response.statusText}` })
      };
    }

    const result = await response.json();

    // Decode base64 content
    const decoded = Buffer.from(result.content, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);

    // Pastikan setiap santri punya markData
    const dataWithMark = data.map(s => ({
      id: s.id,
      nama: s.nama,
      markData: s.markData || {}
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(dataWithMark)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
