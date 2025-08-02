import fetch from "node-fetch";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const token = process.env.MTQ_TOKEN;
  const owner = "dickymiswardi";
  const repo = "usermtq";

  try {
    const body = JSON.parse(event.body);
    const { tanggal, kelas, data } = body;

    const filename = `absensi/${kelas}_${tanggal}.json`;

    // Ambil SHA file jika sudah ada (update), kalau tidak ada berarti create
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;

    let sha = null;
    const checkRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    const message = sha ? `update data absensi ${kelas} ${tanggal}` : `create data absensi ${kelas} ${tanggal}`;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
        sha
      })
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}
