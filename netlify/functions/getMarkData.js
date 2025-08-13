export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const { kelas, tanggal } = event.queryStringParameters || {};

  if (!kelas || !tanggal) {
    return { statusCode: 400, body: JSON.stringify({ error: "kelas & tanggal wajib diisi" }) };
  }

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
      return { statusCode: response.status, body: JSON.stringify({ error: `Gagal fetch data: ${response.status}` }) };
    }

    const result = await response.json();
    const decoded = Buffer.from(result.content, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);

    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
