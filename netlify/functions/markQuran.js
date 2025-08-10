// netlify/functions/markQuran.js
const fetch = require("node-fetch");

const GITHUB_API = "https://api.github.com";
const REPO = "dickymiswardi/usermtq";
const TOKEN = process.env.MTQ_TOKEN;
const FILE_PATH = "mark-quran.json";

exports.handler = async (event) => {
  if (!["GET", "POST"].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    // GET → ambil isi file
    if (event.httpMethod === "GET") {
      const res = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${FILE_PATH}`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/vnd.github.v3.raw",
        },
      });

      if (!res.ok) {
        return {
          statusCode: res.status,
          body: JSON.stringify({ message: "Gagal mengambil data." }),
        };
      }

      const text = await res.text();
      return {
        statusCode: 200,
        body: text,
      };
    }

    // POST → simpan/update file
    if (event.httpMethod === "POST") {
      let newData;
      try {
        newData = JSON.parse(event.body || "{}");
      } catch (err) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Format JSON tidak valid." }),
        };
      }

      // Ambil SHA file lama (kalau ada)
      let sha = null;
      const checkRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${FILE_PATH}`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (checkRes.ok) {
        const fileJson = await checkRes.json();
        sha = fileJson.sha;
      }

      // Simpan ke GitHub
      const saveRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${FILE_PATH}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: "Update mark-quran.json",
          content: Buffer.from(JSON.stringify(newData, null, 2)).toString("base64"),
          sha: sha || undefined,
        }),
      });

      if (!saveRes.ok) {
        const errText = await saveRes.text();
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Gagal menyimpan file.", error: errText }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Data berhasil disimpan." }),
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Terjadi kesalahan server.", error: err.message }),
    };
  }
};
