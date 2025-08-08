const fetch = require('node-fetch');

const GITHUB_API = 'https://api.github.com/repos/dickymiswardi/usermtq/contents/absensi';
const TOKEN = process.env.MTQ_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      const error = await res.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Gagal fetch file kelas', error }),
      };
    }

    const data = await res.json();

    const kelasFiles = data
      .filter(file => /^kelas_.*\.json$/.test(file.name)) // bisa pakai nama bebas
      .map(file => file.name.replace('.json', '')); // contoh: kelas_1, kelas_abc

    return {
      statusCode: 200,
      body: JSON.stringify(kelasFiles),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Terjadi kesalahan', error: err.message }),
    };
  }
};
