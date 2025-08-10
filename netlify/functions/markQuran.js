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
    if (event.httpMethod === "GET") {
      // Ambil file mark-quran.json dari GitHub sebagai raw content
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

    if (event.httpMethod === "POST") {
      // Parsing body JSON
      let newData;
      try {
        newData = JSON.parse(event.body || "{}");
      } catch (err) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Format JSON tidak valid." }),
        };
      }

      // Validasi minimal field wajib
      if (
        !newData.idSiswa ||
        typeof newData.idSiswa !== "number" ||
        !newData.markQuran ||
        typeof newData.nilai !== "number" ||
        !newData.predikat
      ) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Data yang dikirim tidak lengkap atau salah format." }),
        };
      }

      // Ambil isi file lama dan SHA-nya untuk update file
      let oldData = [];
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
        const contentBase64 = fileJson.content;
        try {
          oldData = JSON.parse(Buffer.from(contentBase64, "base64").toString("utf-8"));
          if (!Array.isArray(oldData)) oldData = [];
        } catch {
          oldData = [];
        }
      }

      // Update data jika idSiswa sudah ada, atau tambah baru
      const index = oldData.findIndex((item) => item.idSiswa === newData.idSiswa);
      if (index >= 0) {
        oldData[index] = newData;
      } else {
        oldData.push(newData);
      }

      // Simpan file baru ke GitHub (PUT dengan SHA jika update)
      const saveRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${FILE_PATH}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Update mark-quran.json untuk idSiswa ${newData.idSiswa}`,
          content: Buffer.from(JSON.stringify(oldData, null, 2)).toString("base64"),
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
