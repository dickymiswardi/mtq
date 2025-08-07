const fetch = require('node-fetch');

const GITHUB_API = 'https://api.github.com/repos/dickymiswardi/usermtq/contents/user.json';
const TOKEN = process.env.MTQ_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Username dan password wajib diisi.' })
      };
    }

    // Ambil isi file user.json dari GitHub
    const res = await fetch(GITHUB_API, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const json = await res.json();
    const currentContent = Buffer.from(json.content, 'base64').toString();
    const users = JSON.parse(currentContent);

    // Cek duplikat
    if (users.some(u => u.username === username)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Username sudah terdaftar.' })
      };
    }

    // Tambah user baru
    users.push({ username, password });
    const updatedContent = Buffer.from(JSON.stringify(users, null, 2)).toString('base64');

    // Push ke GitHub
    const update = await fetch(GITHUB_API, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Tambah user ${username}`,
        content: updatedContent,
        sha: json.sha
      })
    });

    if (!update.ok) {
      const text = await update.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Gagal menyimpan ke GitHub.', error: text })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Pendaftaran berhasil!' })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Terjadi kesalahan server.', error: err.message })
    };
  }
};
