const { Octokit } = require("@octokit/core");

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.MTQ_TOKEN;
  const repo = 'dickymiswardi/usermtq';
  const octokit = new Octokit({ auth: token });

  try {
    const body = JSON.parse(event.body);
    const nama = body.nama.replace(/\s+/g, '').toLowerCase();

    if (!nama) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Nama kelas tidak valid' })
      };
    }

    const path = `absensi/kelas_${nama}.json`;
    const defaultContent = JSON.stringify([], null, 2);
    const base64Content = Buffer.from(defaultContent).toString('base64');

    // Cek jika file sudah ada
    try {
      await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: 'dickymiswardi',
        repo: 'usermtq',
        path
      });
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Kelas sudah ada' })
      };
    } catch (err) {
      // file not found = boleh buat
    }

    // Buat file baru
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: 'dickymiswardi',
      repo: 'usermtq',
      path,
      message: `Buat file kelas_${nama}.json`,
      content: base64Content
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Kelas berhasil dibuat' })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Gagal membuat kelas', error: err.message })
    };
  }
};
