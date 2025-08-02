export async function handler(event) {
  const token = process.env.MTQ_TOKEN;

  // Ambil parameter kelas dari query string
  const kelas = event.queryStringParameters.kelas;
  if (!kelas) {
    return { statusCode: 400, body: JSON.stringify({ error: "Parameter 'kelas' wajib diisi" }) };
  }

  // URL file json di repo privat (kelas_1.json atau kelas_2.json)
  const url = `https://github.com/dickymiswardi/usermtq/raw/refs/heads/main/${kelas}.json`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`Gagal fetch data: ${response.status}`);

    const data = await response.text();
    return { 
      statusCode: 200, 
      headers: { "Content-Type": "application/json" }, 
      body: data 
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }) 
    };
  }
}
