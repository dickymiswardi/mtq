// netlify/functions/getAbsensi.js
const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Metode tidak diizinkan" };
  }

  try {
    const kelas = event.queryStringParameters.kelas;
    const tanggal = event.queryStringParameters.tanggal;

    if (!kelas || !tanggal) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Parameter kelas & tanggal wajib ada" }),
      };
    }

    const fileName = `${kelas}_${tanggal}.json`;
    const filePath = path.join(__dirname, "../../absensi", fileName);

    if (!fs.existsSync(filePath)) {
      // Tidak ada data, kembalikan array kosong
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const data = fs.readFileSync(filePath, "utf8");
    return {
      statusCode: 200,
      body: data,
    };
  } catch (err) {
    console.error("Error getAbsensi.js:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Gagal membaca data absensi" }),
    };
  }
};
