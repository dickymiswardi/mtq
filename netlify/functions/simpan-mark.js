// netlify/functions/simpan-mark.js
import fetch from "node-fetch";

const owner = "dickymiswardi";
const repo = "usermtq";
const filePath = "mark-data.json";
const branch = "main";
const token = process.env.MTQ_TOKEN;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metode tidak diizinkan" });
  }

  try {
    const { idSiswa, markData } = req.body;

    if (!idSiswa || !markData) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    // Ambil file lama dari GitHub
    let oldContent = [];
    let sha = null;

    const getRes = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}` },
    });

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      oldContent = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf8"));
    } else if (getRes.status !== 404) {
      throw new Error(`Gagal ambil file: ${getRes.statusText}`);
    }

    // Update atau tambah data santri
    const existingIndex = oldContent.findIndex(item => item.idSiswa === idSiswa);
    if (existingIndex !== -1) {
      oldContent[existingIndex] = { idSiswa, markData };
    } else {
      oldContent.push({ idSiswa, markData });
    }

    // Simpan kembali ke GitHub
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update markData idSiswa=${idSiswa}`,
        content: Buffer.from(JSON.stringify(oldContent, null, 2)).toString("base64"),
        sha,
        branch,
      }),
    });

    if (!putRes.ok) {
      const errData = await putRes.json();
      throw new Error(errData.message || "Gagal menyimpan file ke GitHub");
    }

    return res.status(200).json({ success: true, data: oldContent });
  } catch (err) {
    console.error("Error simpan mark:", err);
    return res.status(500).json({ error: err.message });
  }
}
