// netlify/functions/simpan-mark-quran.js
import fetch from "node-fetch";

const owner = "dickymiswardi";
const repo = "usermtq";
const filePath = "mark-quran.json"; // path relatif di repo
const branch = "main";
const token = process.env.MTQ_TOKEN;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { tanggalFile, idSiswa, markQuran, nilai, predikat } = req.body;

    if (!tanggalFile || !idSiswa || !markQuran) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    // Ambil file mark-quran.json dari GitHub
    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    const getRes = await fetch(getUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3.raw",
      },
    });

    let existingData = [];
    let sha = null;

    if (getRes.ok) {
      sha = (await getRes.json()).sha; // ambil SHA versi terbaru file
      const rawFileRes = await fetch(getUrl, {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3.raw",
        },
      });
      existingData = await rawFileRes.json();
    }

    // Hapus data lama untuk idSiswa + tanggalFile yang sama
    existingData = existingData.filter(
      (item) => !(item.tanggalFile === tanggalFile && item.idSiswa === idSiswa)
    );

    // Tambahkan data baru
    existingData.push({
      tanggalFile,
      idSiswa,
      markQuran,
      nilai,
      predikat,
    });

    // Simpan ke GitHub
    const putRes = await fetch(getUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update markQuran ${idSiswa} untuk ${tanggalFile}`,
        content: Buffer.from(JSON.stringify(existingData, null, 2)).toString("base64"),
        sha,
        branch,
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(errText);
    }

    res.status(200).json({ success: true, message: "Mark Quran berhasil disimpan" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
