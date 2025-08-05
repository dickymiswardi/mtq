const { Octokit } = require("@octokit/core");

exports.handler = async function (event, context) {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = "dickymiswardi";
  const repoName = "usermtq";
  const path = `rekap_juz/total_juz.json`;
  const branch = "main";

  const octokit = new Octokit({ auth: token });

  const input = JSON.parse(event.body);
  const { tanggal, data } = input;

  try {
    // Ambil file sebelumnya (jika ada)
    let existing = [];
    let sha = null;

    try {
      const getRes = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner: repoOwner,
          repo: repoName,
          path,
          ref: branch
        }
      );

      const content = Buffer.from(getRes.data.content, "base64").toString();
      existing = JSON.parse(content);
      sha = getRes.data.sha;
    } catch (e) {
      if (e.status !== 404) throw e; // kalau file belum ada, biarkan kosong
    }

    existing.push({ tanggal, data });

    const updateRes = await octokit.request(
      "PUT /repos/{owner}/{repo}/contents/{path}",
      {
        owner: repoOwner,
        repo: repoName,
        path,
        branch,
        message: `Menambahkan total juz ${tanggal}`,
        content: Buffer.from(JSON.stringify(existing, null, 2)).toString("base64"),
        sha: sha || undefined
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, update: updateRes.data.commit.sha })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: err.message })
    };
  }
};
