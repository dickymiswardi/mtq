// netlify/functions/upload-audio.js
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const tmpDir = "/tmp"; // direktori temporer Netlify

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { fileName, base64, chunkIndex = 0, totalChunks = 1, folder = "audio" } = JSON.parse(event.body);

    if (!fileName || !base64) {
      return { statusCode: 400, body: JSON.stringify({ error: "Data tidak lengkap" }) };
    }

    // simpan chunk sementara di /tmp
    const chunkFile = path.join(tmpDir, `${fileName}.chunk${chunkIndex}`);
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(chunkFile, buffer);

    // kalau belum semua chunk, return sukses sementara
    if (chunkIndex < totalChunks - 1) {
      return { statusCode: 200, body: JSON.stringify({ success: true, chunkIndex }) };
    }

    // gabungkan semua chunk
    let finalBuffer = Buffer.alloc(0);
    for (let i = 0; i < totalChunks; i++) {
      const cFile = path.join(tmpDir, `${fileName}.chunk${i}`);
      if (!fs.existsSync(cFile)) {
        throw new Error(`Chunk ${i} tidak ditemukan`);
      }
      const b = fs.readFileSync(cFile);
      finalBuffer = Buffer.concat([finalBuffer, b]);
      fs.unlinkSync(cFile); // hapus chunk setelah gabung
    }

    // encode finalBuffer ke base64
    const finalBase64 = finalBuffer.toString('base64');

    // commit ke GitHub
    const gitPath = `${folder}/${fileName}`;
    const url = `https://api.github.com/repos/dickymiswardi/usermtq/contents/${gitPath}`;

    // cek apakah file sudah ada
    let sha = null;
    try {
      const existing = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" }
      });
      if (existing.ok) {
        const json = await existing.json();
        sha = json.sha;
      }
    } catch(e) {}

    // PUT file final
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: sha ? `Update audio ${fileName}` : `Add audio ${fileName}`,
        content: finalBase64,
        sha: sha || undefined
      })
    });

    const resText = await res.text();
    let jsonRes;
    try { jsonRes = JSON.parse(resText); }
    catch(e) { throw new Error("Respon GitHub bukan JSON: " + resText); }

    if (!res.ok) throw new Error(jsonRes.message || 'Gagal upload audio');

    return { statusCode: 200, body: JSON.stringify({ success: true, path: gitPath }) };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
