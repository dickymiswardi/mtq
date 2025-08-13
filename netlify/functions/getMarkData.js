// netlify/functions/getMarkData.js
export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const kelas = event.queryStringParameters?.kelas;
  const tanggal = event.queryStringParameters?.tanggal;

  if (!kelas || !tanggal) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parameter 'kelas' dan 'tanggal' wajib diisi" })
    };
  }

  // URL GitHub API untuk file JSON
  const apiUrl = `https://api.github.com/repos/dickymiswardi/usermtq/contents/absensi/kelas_${kelas}_${tanggal}.json`;

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
        body: JSON.stringify({ error: `Gagal fetch data: ${response.status} ${response.statusText}` })
      };
    }

    const result = await response.json();

    if (!result.content) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "File JSON tidak ditemukan di GitHub" })
      };
    }

    // Decode base64 ke string JSON
    const decoded = Buffer.from(result.content, 'base64').toString('utf-8');

    // Optional: validasi JSON
    let data = [];
    try { data = JSON.parse(decoded); } 
    catch(err) {
      return { statusCode: 500, body: JSON.stringify({ error: "JSON tidak valid" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
