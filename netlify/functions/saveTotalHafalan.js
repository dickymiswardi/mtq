// netlify/functions/saveTotalHafalan.js
import fetch from "node-fetch";
import { Octokit } from "@octokit/core";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const { kelas } = event.queryStringParameters;

  if (!kelas) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parameter 'kelas' wajib diisi" }),
    };
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  const baseURL = `https://raw.githubusercontent.com/dickymiswardi/usermtq/main/absensi/`;

  try {
    // Ambil daftar file JSON absensi
    const listRes = await fetch(
      `https://api.github.com/repos/dickymiswardi/usermtq/contents/absensi`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const list = await listRes.json();

    const filtered = list.filter(item => item.name.startsWith(kelas) && item.name.endsWith(".json"));

    const rekapPerTanggal = {};

    for (const file of filtered) {
      const tanggalMatch = file.name.match(/_(\d{4}-\d{2}-\d{2})\.json$/);
      if (!tanggalMatch) continue;
      const tanggal = tanggalMatch[1];

      const res = await fetch(`${baseURL}${file.name}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const absensiData = await res.json();

      const perTanggalData = absensiData.map((entry, index) => ({
        id: typeof entry.id === "number" && entry.id > 0 ? entry.id : index + 1,
        nama: entry.nama || `Santri ${index + 1}`,
        semester: entry.semester ? parseInt(entry.semester) : null,
        totalJuz: entry.totalJuz ? parseFloat(parseFloat(entry.totalJuz).toFixed(2)) : 0,
      }));

      rekapPerTanggal[tanggal] = perTanggalData;
    }

    const finalData = {
      kelas,
      rekap: rekapPerTanggal,
    };

    const filePath = `rekap/${kelas}.json`;

    // Ambil SHA jika file sudah ada
    let sha = null;
    try {
      const res = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner: "dickymiswardi",
          repo: "usermtq",
          path: filePath,
        }
      );
      sha = res.data.sha;
    } catch (e) {
      // File belum ada, biarkan sha = null
    }

    const contentEncoded = Buffer.from(JSON.stringify(finalData, null, 2)).toString("base64");

    await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner: "dickymiswardi",
      repo: "usermtq",
      path: filePath,
      message: `Save total hafalan kelas ${kelas}`,
      content: contentEncoded,
      sha: sha || undefined,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, file: filePath }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
