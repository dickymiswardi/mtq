// netlify/functions/saveTotalHafalan.js
import fetch from "node-fetch";
import { Octokit } from "@octokit/core";

export async function handler(event) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Hanya 1 token dipakai
  const { kelas } = event.queryStringParameters;

  if (!kelas) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parameter 'kelas' wajib diisi" }),
    };
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  const absensiURL = `https://api.github.com/repos/dickymiswardi/usermtq/contents/absensi`;
  const rawURL = `https://raw.githubusercontent.com/dickymiswardi/usermtq/main/absensi/`;

  try {
    // Ambil semua file absensi
    const listRes = await fetch(absensiURL, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });

    if (!listRes.ok) throw new Error(`Gagal ambil daftar file absensi: ${listRes.status}`);
    const fileList = await listRes.json();

    // Filter file berdasarkan kelas_x_YYYY-MM-DD.json
    const filteredFiles = fileList.filter(file =>
      file.name.startsWith(kelas) && file.name.endsWith(".json")
    );

    const rekapPerTanggal = {};

    for (const file of filteredFiles) {
      const tanggalMatch = file.name.match(/_(\d{4}-\d{2}-\d{2})\.json$/);
      if (!tanggalMatch) continue;
      const tanggal = tanggalMatch[1];

      const absensiRes = await fetch(`${rawURL}${file.name}`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
      });

      if (!absensiRes.ok) {
        console.warn(`Gagal ambil file ${file.name}, dilewati`);
        continue;
      }

      const absensiData = await absensiRes.json();

      const perTanggal = absensiData.map((entry, idx) => ({
        id: typeof entry.id === "number" && entry.id > 0 ? entry.id : idx + 1,
        nama: entry.nama || `Santri ${idx + 1}`,
        semester: typeof entry.semester === "number" && entry.semester > 0
          ? entry.semester
          : null,
        totalJuz: typeof entry.totalJuz === "number"
          ? parseFloat(entry.totalJuz.toFixed(2))
          : 0,
      }));

      rekapPerTanggal[tanggal] = perTanggal;
    }

    const finalData = {
      kelas,
      rekap: rekapPerTanggal,
    };

    const filePath = `rekap/${kelas}.json`;

    // Ambil SHA jika file sudah ada (update)
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
    } catch (err) {
      if (err.status !== 404) {
        throw new Error(`Gagal cek SHA file: ${err.message}`);
      }
      // file belum ada, biarkan sha = null
    }

    const contentEncoded = Buffer.from(JSON.stringify(finalData, null, 2)).toString("base64");

    // Simpan file ke GitHub
    await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner: "dickymiswardi",
      repo: "usermtq",
      path: filePath,
      message: `Update rekap total hafalan ${kelas}`,
      content: contentEncoded,
      sha: sha || undefined,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, file: filePath }),
    };
  } catch (err) {
    console.error("Gagal menyimpan rekap total hafalan:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
