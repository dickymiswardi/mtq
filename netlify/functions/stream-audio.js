// netlify/functions/stream-audio.js
import fetch from "node-fetch";

export async function handler(event) {
  const token = process.env.MTQ_TOKEN;
  const { file } = event.queryStringParameters || {};

  if (!file) return { statusCode: 400, body: "Parameter file tidak ada" };

  try {
    const url = `https://api.github.com/repos/dickymiswardi/usermtq/contents/audio/${file}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3.raw" }
    });

    if (!res.ok) return { statusCode: res.status, body: `File ${file} tidak ditemukan` };

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let contentType = "audio/mpeg"; // default mp3
    if (file.endsWith(".wav")) contentType = "audio/wav";
    else if (file.endsWith(".ogg")) contentType = "audio/ogg";
    else if (file.endsWith(".mp3")) contentType = "audio/mpeg";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${file}"`
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error: " + err.message };
  }
}
