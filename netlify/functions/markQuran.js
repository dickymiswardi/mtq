const fetch = require("node-fetch");

const GITHUB_API = "https://api.github.com";
const REPO = "dickymiswardi/usermtq";
const TOKEN = process.env.MTQ_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const { kelas, tanggal, id, markQuran, nilai, predikat } = JSON.parse(event.body || "{}");

    if (!kelas || !tanggal || !id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "kelas, tanggal, dan id wajib diisi" }),
      };
    }

    const path = `absensi/kelas_${kelas}_${tanggal}.json`;

    // Ambil data lama
    const getRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!getRes.ok) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "File absensi tidak ditemukan" }),
      };
    }

    const fileData = await getRes.json();
    const contentJson = JSON.parse(Buffer.from(fileData.content, "base64").toString());

    // Update data pada id yang sesuai
    const index = contentJson.findIndex(s => s.id === id);
    if (index === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: `Santri dengan id ${id} tidak ditemukan` }),
      };
    }

    contentJson[index].markQuran = markQuran;
    contentJson[index].nilai = nilai;
    contentJson[index].predikat = predikat;

    // Encode kembali ke base64
    const newContent = Buffer.from(JSON.stringify(contentJson, null, 2)).toString("base64");

    // Simpan perubahan
    const updateRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: `Update mark Quran untuk id ${id}`,
        content: newContent,
        sha: fileData.sha,
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Gagal memperbarui file", error: errText }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Mark Quran berhasil disimpan" }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Terjadi kesalahan server", error: err.message }),
    };
  }
};
