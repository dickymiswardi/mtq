// netlify/functions/simpan-mark-quran.js
import fetch from "node-fetch";

const owner = "dickymiswardi";
const repo = "usermtq";
const filePath = "mark-quran.json";
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

    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

    // Ambil SHA & data lama
    const metaRes = await fetch(getUrl, {
      headers: { Authorization: `token ${token}` },
    });
    if (!metaRes.ok) throw new Error(`Gagal ambil metadata file: ${metaRes.statusText}`);

    const metaJson = await metaRes.json();
    const sha = metaJson.sha;

    // Ambil isi JSON asli
    const fileRes = await fetch(getUrl, {
      headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3.raw" },
    });
    let existingData = await fileRes.json();

    // Hapus data lama untuk idSiswa & tanggalFile yang sama
    existingData = existingData.filter(
      (item) => !(item.tanggalFile === tanggalFile && item.idSiswa === idSiswa)
    );

    // Tambah data baru
    existingData.push({ tanggalFile, idSiswa, markQuran, nilai, predikat });

    // Simpan kembali
    const putRes = await fetch(getUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update markQuran ${idSiswa} (${tanggalFile})`,
        content: Buffer.from(JSON.stringify(existingData, null, 2)).toString("base64"),
        sha,
        branch,
      }),
    });

    if (!putRes.ok) throw new Error(await putRes.text());

    return res.status(200).json({ success: true, message: "Mark Quran berhasil disimpan" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
