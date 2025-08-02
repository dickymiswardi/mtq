export async function handler(event) {
  const token = process.env.MTQ_TOKEN;

  // Ambil parameter kelas
  const kelas = event.queryStringParameters.kelas;
  if (!kelas) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Parameter 'kelas' wajib diisi" }),
    };
  }

  // URL file json di repo privat
  const url = `https://github.com/dickymiswardi/usermtq/raw/refs/heads/main/${kelas}.json`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Gagal fetch data: ${response.status}` }),
      };
    }

    const data = await response.text();
    return { statusCode: 200, body: data };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
