// netlify/functions/upload-audio.js
import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN; // GitHub Personal Access Token

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { fileName, base64, folder = "audio" } = JSON.parse(event.body);

    if (!fileName || !base64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "fileName dan base64 wajib ada" })
      };
    }

    // hapus prefix data:...;base64, jika ada
    const cleanBase64 = base64.replace(/^data:.*;base64,/, "");

    const path = `${folder}/${fileName}`;
    const url = `https://api.github.com/repos/dickymiswardi/usermtq/contents/${path}`;

    // cek apakah file sudah ada (get sha)
    let sha = null;
    try {
      const existing = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json"
        }
      });
      if (existing.ok) {
        const json = await existing.json();
        sha = json.sha;
      }
    } catch {
      // kalau file belum ada, lanjut
    }

    // upload/update file
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: sha
          ? `Update audio file: ${fileName}`
          : `Add new audio file: ${fileName}`,
        content: cleanBase64,
        sha: sha || undefined,
      }),
    });

    const resText = await res.text();
    let jsonRes;
    try {
      jsonRes = JSON.parse(resText);
    } catch (e) {
      throw new Error(`Respon GitHub bukan JSON: ${resText}`);
    }

    if (!res.ok) {
      throw new Error(jsonRes.message || "Gagal upload audio");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        path,
        commit: jsonRes.commit?.sha || null
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
