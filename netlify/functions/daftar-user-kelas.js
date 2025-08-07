const fetch = require("node-fetch");

const REPO = "dickymiswardi/usermtq";
const token = process.env.MTQ_TOKEN;
const GITHUB_API = "https://api.github.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { username, password, akses_kelas, adminPassword, kelasBaru } = JSON.parse(event.body);

  try {
    // 1. Ambil secure.json untuk verifikasi password admin
    const secureRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/secure.json`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    const secureData = await secureRes.json();
    const secureDecoded = JSON.parse(Buffer.from(secureData.content, "base64").toString("utf-8"));

    if (secureDecoded.adminPassword !== adminPassword) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Password admin salah." })
      };
    }

    // 2. Ambil user.json
    const userRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/user.json`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    const userData = await userRes.json();
    const sha = userData.sha;
    const users = JSON.parse(Buffer.from(userData.content, "base64").toString("utf-8"));

    // 3. Tambahkan user baru
    users.push({ username, password, akses_kelas });

    // 4. Simpan user.json
    const newContent = Buffer.from(JSON.stringify(users, null, 2)).toString("base64");

    await fetch(`${GITHUB_API}/repos/${REPO}/contents/user.json`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: `Menambahkan user ${username}`,
        content: newContent,
        sha,
      }),
    });

    // 5. Jika ada kelasBaru, buat file baru
    if (kelasBaru) {
      const namaFile = `kelas_${kelasBaru}.json`;
      const kelasContent = Buffer.from("[]").toString("base64");

      await fetch(`${GITHUB_API}/repos/${REPO}/contents/${namaFile}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Membuat file ${namaFile}`,
          content: kelasContent,
        }),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
