// netlify/functions/aksesAutoUpdateAllJuz.js
import fetch from "node-fetch";

const GITHUB_REPO = "dickymiswardi/usermtq";
const FILE_PATH = "autoUpdateAllJuz.json";
const BRANCH = "main";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN; // Simpan token GitHub di Netlify ENV sebagai MTQ_TOKEN
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;

  if (event.httpMethod === "GET") {
    // Ambil isi file JSON dari repo
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        return {
          statusCode: res.status,
          body: JSON.stringify({ error: `Gagal ambil file: ${res.statusText}` }),
        };
      }
      const data = await res.json();
      const content = Buffer.from(data.content, "base64").toString("utf8");
      return {
        statusCode: 200,
        body: content,
      };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  if (event.httpMethod === "POST") {
    try {
      // Ambil sha file untuk update (required oleh GitHub API)
      const existingRes = await fetch(url, { headers });
      if (!existingRes.ok) {
        return {
          statusCode: existingRes.status,
          body: JSON.stringify({ error: `Gagal ambil file (sha): ${existingRes.statusText}` }),
        };
      }
      const fileData = await existingRes.json();
      const sha = fileData.sha;

      const body = JSON.parse(event.body);

      const newContent = Buffer.from(JSON.stringify(body, null, 2)).toString("base64");

      const updateRes = await fetch(url, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Update ${FILE_PATH} via Netlify Function at ${new Date().toISOString()}`,
          content: newContent,
          sha,
          branch: BRANCH,
        }),
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        return {
          statusCode: updateRes.status,
          body: JSON.stringify({ error: `Gagal update file: ${errText}` }),
        };
      }

      const updateResult = await updateRes.json();

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "File berhasil diupdate", data: updateResult.content }),
      };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
}
