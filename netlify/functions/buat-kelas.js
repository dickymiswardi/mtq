const fetch = require("node-fetch");

const GITHUB_API_BASE = "https://api.github.com";
const REPO = "dickymiswardi/usermtq";
const TOKEN = process.env.MTQ_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  const { namaFile } = JSON.parse(event.body || "{}");

  if (!namaFile) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "namaFile harus disertakan" }),
    };
  }

  const path = `absensi/${namaFile}`;
  const content = JSON.stringify([]); // isi awal kosong
  const encodedContent = Buffer.from(content).toString("base64");

  const res = await fetch(`${GITHUB_API_BASE}/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Membuat file ${namaFile}`,
      content: encodedContent,
    }),
  });

  if (res.ok) {
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } else {
    const err = await res.json();
    return {
      statusCode: res.status,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
