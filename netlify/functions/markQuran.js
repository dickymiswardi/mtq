// netlify/functions/markQuran.js
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
    const { tanggalFile, idSiswa, markQuran, nilai, predikat } = JSON.parse(event.body || "{}");

    if (!tanggalFile || !idSiswa) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "tanggalFile dan idSiswa wajib diisi" }),
      };
    }

    const path = `absensi/${tanggalFile}`;

    // Ambil file lama
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
    const existingContent = JSON.parse(Buffer.from(fileData.content, "base64").toString());

    // Update data siswa
    const idx = existingContent.findIndex(s => s.id === idSiswa);
    if (idx === -1) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Siswa tidak ditemukan" }),
      };
    }

    existingContent[idx].markQuran = markQuran;
    existingContent[idx].nilai = nilai;
    existingContent[idx].predikat = predikat;

    // Simpan kembali
    const updatedContent = Buffer.from(JSON.stringify(existingContent, null, 2)).toString("base64");

    const updateRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: `Update mark Quran untuk siswa ${idSiswa}`,
        content: updatedContent,
        sha: fileData.sha,
      }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Gagal update file.", error: errText }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Data mark Quran berhasil disimpan." }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Terjadi kesalahan server.", error: err.message }),
    };
  }
};
