// netlify/functions/upload-audio.js
import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN; // GitHub Personal Access Token

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { fileName, base64, folder = "audio" } = JSON.parse(event.body);

    if (!fileName || !base64) {
      return { statusCode: 400, body: JSON.stringify({ error: "Data tidak lengkap" }) };
    }

    const path = `${folder}/${fileName}`;
    const url = `https://api.github.com/repos/dickymiswardi/usermtq/contents/${path}`;

    // Cek apakah file sudah ada
    let sha = null;
    const existing = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" }
    });

    if (existing.status === 200) {
      const json = await existing.json();
      sha = json.sha;
    }

    // Simpan atau update file di GitHub
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: sha ? `Update audio ${fileName}` : `Add audio ${fileName}`,
        content: base64, // base64 tanpa prefix data:audio/...
        sha: sha || undefined,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal menyimpan audio: ${res.status} - ${errText}`);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, path }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
