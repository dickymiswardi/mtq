import fetch from "node-fetch";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = "dickymiswardi";
const repo = "usermtq";

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { id, kelas, tanggal, dataBaru } = JSON.parse(event.body);

    if (!id || !kelas || !tanggal || !dataBaru) {
      return { statusCode: 400, body: "Parameter kurang" };
    }

    const path = `absensi/kelas_${kelas}_${tanggal}.json`;

    // 🔹 Ambil data lama dari GitHub
    let dataLama = {};
    try {
      const res = await octokit.repos.getContent({ owner, repo, path });
      const content = Buffer.from(res.data.content, "base64").toString("utf-8");
      dataLama = JSON.parse(content);
    } catch (err) {
      console.log("Belum ada file lama, buat baru.");
      dataLama = {};
    }

    // 🔹 Ambil mark lama untuk siswa ini
    const markLama = (dataLama[id] && dataLama[id].marks) ? dataLama[id].marks : {};

    // 🔹 Gabungkan data lama & baru
    const markGabungan = {
      ...markLama,
      ...dataBaru.marks,
      audio: [
        ...(markLama.audio || []),
        ...(dataBaru.marks?.audio || [])
      ]
    };

    // 🔹 Update data siswa
    dataLama[id] = {
      ...(dataLama[id] || {}),
      ...dataBaru,
      marks: markGabungan
    };

    // 🔹 Simpan kembali ke GitHub
    const newContent = Buffer.from(JSON.stringify(dataLama, null, 2)).toString("base64");

    let sha;
    try {
      const res = await octokit.repos.getContent({ owner, repo, path });
      sha = res.data.sha;
    } catch (err) {
      sha = undefined;
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Update data mutabaah id=${id} kelas=${kelas} tanggal=${tanggal}`,
      content: newContent,
      sha
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Data berhasil disimpan" })
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
}
