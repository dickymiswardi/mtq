// netlify/functions/simpan-mark-quran.js
import fetch from "node-fetch";

const owner = "dickymiswardi";
const repo = "usermtq";
const filePath = "mark-quran.json"; // file di repo privat
const branch = "main";
const token = process.env.MTQ_TOKEN;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { kelas, tanggal, id, nama, markData } = req.body;

    if (!kelas || !tanggal || !id || !markData) {
      return res.status(400).json({ error: "Data tidak lengkap" });
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    // Ambil file lama
    const getFile = await fetch(url, {
      headers: { Authorization: `token ${token}` },
    });

    let sha = null;
    let jsonData = [];

    if (getFile.ok) {
      const file = await getFile.json();
      sha = file.sha;
      const content = Buffer.from(file.content, "base64").toString("utf8");
      jsonData = JSON.parse(content);
    }

    // Cari data untuk tanggal & kelas
    let tanggalEntry = jsonData.find(d => d.tanggal === tanggal && d.kelas === kelas);
    if (!tanggalEntry) {
      tanggalEntry = { tanggal, kelas, data: [] };
      jsonData.push(tanggalEntry);
    }

    // Update atau tambah data santri
    const existingSantri = tanggalEntry.data.find(s => s.id === id);
    if (existingSantri) {
      existingSantri.nama = nama;
      existingSantri.mark = markData;
    } else {
      tanggalEntry.data.push({ id, nama, mark: markData });
    }

    // Simpan ke GitHub
    const updateFile = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update mark Quran ${nama} (${tanggal} - ${kelas})`,
        content: Buffer.from(JSON.stringify(jsonData, null, 2)).toString("base64"),
        sha,
        branch,
      }),
    });

    if (!updateFile.ok) {
      throw new Error(`Gagal update file: ${updateFile.statusText}`);
    }

    res.status(200).json({ success: true, message: "Mark Quran berhasil disimpan" });
  } catch (error) {
    console.error("Error simpan mark quran:", error);
    res.status(500).json({ error: error.message });
  }
}
