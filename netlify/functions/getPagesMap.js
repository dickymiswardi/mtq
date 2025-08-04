// netlify/functions/getPagesMap.js
import fetch from "node-fetch";

export async function handler() {
  const token = process.env.MTQ_TOKEN;

  // URL file getPagesMap.json di repo privat
  const url = "https://raw.githubusercontent.com/dickymiswardi/usermtq/main/getPagesMap.json";

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
