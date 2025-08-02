export async function handler() {
  const token = process.env.MTQ_TOKEN;

  // URL file getAyat.json di repo privat
  const url = "https://github.com/dickymiswardi/usermtq/raw/refs/heads/main/getAyat.json";

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
