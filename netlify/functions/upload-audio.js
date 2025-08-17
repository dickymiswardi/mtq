// netlify/functions/upload-audio.js
import fetch from "node-fetch";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { fileName, base64 } = JSON.parse(event.body);
    if (!fileName || !base64) {
      return { statusCode: 400, body: "fileName dan base64 wajib ada" };
    }

    const token = process.env.MTQ_TOKEN; // simpan token GitHub di Netlify Environment
    const repo = "dickymiswardi/usermtq";
    const path = `audio/${fileName}`;
    const url = `https://api.github.com/repos/${repo}/contents/${path}`;

    // cek apakah file sudah ada
    let sha = null;
    const check = await fetch(url, { headers: { Authorization: `token ${token}` } });
    if (check.ok) {
      const json = await check.json();
      sha = json.sha;
    }

    // upload file
    const upload = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: sha ? `Update audio: ${fileName}` : `Add audio: ${fileName}`,
        content: base64,
        sha: sha || undefined,
      }),
    });

    if (!upload.ok) {
      const text = await upload.text();
      throw new Error(`GitHub upload error: ${text}`);
    }

    const resJson = await upload.json();
    return { statusCode: 200, body: JSON.stringify({ success: true, path: path, url: resJson.content.download_url }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
}
