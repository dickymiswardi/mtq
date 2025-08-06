import fetch from "node-fetch";
hkhobl
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = process.env.MTQ_TOKEN;
  const { nama, semester, kelas } = JSON.parse(event.body || "{}");

  if (!nama || !semester || !kelas) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Nama, semester, dan kelas wajib diisi" }),
    };
  }

  const filePath = `absensi/${kelas}.json`;
  const apiUrl = `https://api.github.com/repos/dickymiswardi/usermtq/contents/${filePath}`;

  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    let santriList = [];
    let sha = null;

    if (getRes.status === 200) {
      const json = await getRes.json();
      sha = json.sha;
      const content = Buffer.from(json.content, "base64").toString("utf-8");
      santriList = JSON.parse(content);
    }

    // Cari ID terakhir dan tambah 1
    const lastId = santriList.reduce((max, s) => Math.max(max, s.id || 0), 0);
    santriList.push({ id: lastId + 1, nama, semester });

    const updatedContent = Buffer.from(JSON.stringify(santriList, null, 2)).toString("base64");

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: `Tambah santri ${nama} (semester ${semester})`,
        content: updatedContent,
        sha: sha || undefined,
      }),
    });

    if (!putRes.ok) {
      throw new Error(`Gagal update file: ${putRes.status}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
