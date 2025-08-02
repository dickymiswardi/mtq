import { Octokit } from "@octokit/rest";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const octokit = new Octokit({ auth: token });

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { kelas, tanggal, data } = JSON.parse(event.body);

    if (!kelas || !tanggal || !Array.isArray(data)) {
      return { statusCode: 400, body: "Data tidak valid" };
    }

    const path = `absensi/${kelas}_${tanggal}.json`;

    // Ambil konten lama (jika ada)
    let sha;
    try {
      const { data: oldFile } = await octokit.repos.getContent({
        owner: "dickymiswardi",
        repo: "usermtq",
        path,
      });
      sha = oldFile.sha;
    } catch (err) {
      sha = null; // file baru
    }

    // Simpan ke GitHub
    await octokit.repos.createOrUpdateFileContents({
      owner: "dickymiswardi",
      repo: "usermtq",
      path,
      message: `Update absensi ${kelas} ${tanggal}`,
      content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
      sha,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
