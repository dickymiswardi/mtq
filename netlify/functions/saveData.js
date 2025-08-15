// netlify/functions/saveData.js
import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { tanggal, kelas, data } = JSON.parse(event.body);

    if (!tanggal || !kelas || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Data tidak lengkap" }),
      };
    }

    // Upload audio untuk setiap santri jika ada
    for (let santri of data) {
      if (santri.marks?.audioBlob) {
        const fileNameAudio = `audio/${kelas}_${tanggal}_${santri.id}.mp3`;
        const urlAudio = `https://api.github.com/repos/dickymiswardi/usermtq/contents/${fileNameAudio}`;

        // Hilangkan prefix data URL base64
        const audioBase64 = santri.marks.audioBlob.replace(/^data:audio\/\w+;base64,/, "");

        // Cek apakah file audio sudah ada
        let shaAudio = null;
        const checkAudio = await fetch(urlAudio, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (checkAudio.status === 200) {
          const json = await checkAudio.json();
          shaAudio = json.sha;
        }

        // Upload audio ke GitHub
        const resAudio = await fetch(urlAudio, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Upload audio ${santri.nama} tanggal ${tanggal}`,
            content: audioBase64,
            sha: shaAudio || undefined,
          }),
        });

        if (!resAudio.ok) {
          throw new Error(`Gagal upload audio ${santri.nama}`);
        }

        // Ambil link download audio
        const jsonAudio = await resAudio.json();
        santri.audioUrl = jsonAudio.content.download_url;

        // Hapus base64 supaya JSON absensi tidak terlalu besar
        delete santri.marks.audioBlob;
      }
    }

    // Upload file absensi (JSON)
    const fileName = `${kelas}_${tanggal}.json`;
    const url = `https://api.github.com/repos/dickymiswardi/usermtq/contents/absensi/${fileName}`;

    // Cek apakah file absensi sudah ada
    let sha = null;
    const existing = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (existing.status === 200) {
      const json = await existing.json();
      sha = json.sha;
    }

    // Simpan absensi ke GitHub
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update data absensi ${kelas} tanggal ${tanggal}`,
        content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
        sha: sha || undefined,
      }),
    });

    if (!res.ok) {
      throw new Error(`Gagal menyimpan data absensi`);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
