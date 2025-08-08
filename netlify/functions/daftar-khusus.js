const fetch = require('node-fetch');

const GITHUB_API = 'https://api.github.com';
const REPO = 'dickymiswardi/usermtq';
const BRANCH = 'main';
const TOKEN = process.env.MTQ_TOKEN;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { username, password, kelas } = JSON.parse(event.body);
  if (!username || !password || !kelas?.length) {
    return { statusCode: 400, body: 'Data tidak lengkap' };
  }

  // 1. Ambil user_khusus.json
  const pathUser = 'user_khusus.json';
  const userRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${pathUser}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  const userDataRaw = await userRes.json();
  const userList = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString());

  // 2. Tambah user baru
  userList.push({ username, password, kelas });

  const userPayload = {
    message: `Tambah user ${username}`,
    content: Buffer.from(JSON.stringify(userList, null, 2)).toString('base64'),
    sha: userDataRaw.sha,
    branch: BRANCH
  };

  // 3. Simpan kembali user_khusus.json
  await fetch(`${GITHUB_API}/repos/${REPO}/contents/${pathUser}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(userPayload)
  });

  // 4. Buat file kelas baru jika belum ada
  for (const kls of kelas) {
    const filePath = `${kls}.json`;

    const cek = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${filePath}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (cek.status === 404) {
      await fetch(`${GITHUB_API}/repos/${REPO}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Buat file ${filePath}`,
          content: Buffer.from('[]').toString('base64'),
          branch: BRANCH
        })
      });
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
