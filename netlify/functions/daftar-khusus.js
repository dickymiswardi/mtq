const fetch = require('node-fetch');

const GITHUB_API_BASE = 'https://api.github.com';
const REPO = 'dickymiswardi/usermtq';
const TOKEN = process.env.MTQ_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const { adminPassword, username, password, kelasList, kelasBaru } = JSON.parse(event.body || '{}');

    // Validasi input
    if (
      !adminPassword?.trim() ||
      !username?.trim() ||
      !password?.trim() ||
      !Array.isArray(kelasList) ||
      kelasList.length === 0
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Data tidak lengkap.' }),
      };
    }

    // 1. Validasi admin password dengan fungsi lokal
    const cekRes = await fetch(`${process.env.URL}/.netlify/functions/cek-admin`, {
      method: 'POST',
      body: JSON.stringify({ password: adminPassword }),
    });

    if (!cekRes.ok) {
      const text = await cekRes.text();
      return {
        statusCode: 401,
        body: text,
      };
    }

    // 2. Ambil file user_khusus.json dari GitHub
    const filePath = 'user_khusus.json';
    const url = `${GITHUB_API_BASE}/repos/${REPO}/contents/${filePath}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    let content = [];
    let sha = null;

    if (res.ok) {
      const file = await res.json();
      try {
        const decoded = Buffer.from(file.content, 'base64').toString();
        content = JSON.parse(decoded);
        sha = file.sha;
      } catch (err) {
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Gagal membaca file user_khusus.json.', error: err.message }),
        };
      }
    }

    // 3. Cek username sudah ada
    if (content.find((u) => u.username === username.trim())) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'Username sudah terdaftar.' }),
      };
    }

    // 4. Tambahkan user baru
    content.push({
      username: username.trim(),
      password: password.trim(),
      kelas: kelasList,
    });

    const updatedContent = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');

    // 5. Simpan kembali ke GitHub
    const updateRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Tambah user khusus ${username}`,
        content: updatedContent,
        sha,
      }),
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Gagal menyimpan ke GitHub.', error: errorText }),
      };
    }

    // 6. Buat file kelas baru jika diinput
    if (kelasBaru && kelasBaru.trim() !== '') {
      const kelasFile = `kelas_${kelasBaru.trim()}.json`;
      const kelasUrl = `${GITHUB_API_BASE}/repos/${REPO}/contents/${kelasFile}`;

      const cekKelas = await fetch(kelasUrl, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      // Jika belum ada, buat kelas baru
      if (cekKelas.status === 404) {
        await fetch(kelasUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            message: `Buat kelas ${kelasBaru.trim()}`,
            content: Buffer.from("[]").toString('base64'),
          }),
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'User berhasil ditambahkan.' }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Terjadi kesalahan server.',
        error: err.message,
      }),
    };
  }
};
