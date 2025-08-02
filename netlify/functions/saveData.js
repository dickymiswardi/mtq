// netlify/functions/saveData.js
const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Metode tidak diizinkan" };
  }

  try {
    const { tanggal, kelas, data } = JSON.parse(event.body);

    if (!tanggal || !kelas || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Data tidak lengkap" }),
      };
    }

    const folderPath = path.join(__dirname, "../../absensi");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const fileName = `${kelas}_${tanggal}.json`;
    const filePath = path.join(folderPath, fileName);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Data berhasil disimpan" }),
    };
  } catch (err) {
    console.error("Error saveData.js:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Gagal menyimpan data" }),
    };
  }
};
