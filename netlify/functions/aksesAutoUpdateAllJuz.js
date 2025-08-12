import fetch from 'node-fetch';

const GITHUB_REPO = 'dickymiswardi/usermtq';
const FILE_PATH = 'autoUpdateAllJuz.json';
const BRANCH = 'main';

const TOKEN = process.env.GITHUB_TOKEN;

export async function handler(event) {
  if (event.httpMethod === 'GET') {
    // Ambil isi file
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    };
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        return { statusCode: res.status, body: JSON.stringify({ error: 'Gagal ambil file.' }) };
      }
      const json = await res.json();
      const content = Buffer.from(json.content, 'base64').toString('utf8');
      return { statusCode: 200, body: content };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod === 'POST') {
    // Update file dengan data baru (append atau replace sesuai kebutuhan)
    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;

    try {
      // Ambil sha dulu
      const resGet = await fetch(url, { headers });
      if (!resGet.ok) throw new Error('Gagal ambil SHA file');
      const fileData = await resGet.json();
      const sha = fileData.sha;

      // Ambil body JSON baru
      const body = JSON.parse(event.body);

      // Struktur baru yang disimpan di file (bisa diubah sesuai kebutuhan)
      // Misal simpan array history:
      const newData = {
        updatedAt: new Date().toISOString(),
        fromDate: body.fromDate,
        toDate: body.toDate,
        kelas: body.kelas,
        data: body.data,
      };

      // Encode base64
      const contentEncoded = Buffer.from(JSON.stringify(newData, null, 2)).toString('base64');

      // PUT update file
      const updateRes = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Update autoUpdateAllJuz.json at ${new Date().toISOString()}`,
          content: contentEncoded,
          sha,
          branch: BRANCH,
        }),
      });

      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        return { statusCode: updateRes.status, body: JSON.stringify({ error: errorText }) };
      }

      return { statusCode: 200, body: JSON.stringify({ message: 'File berhasil diupdate' }) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
}
