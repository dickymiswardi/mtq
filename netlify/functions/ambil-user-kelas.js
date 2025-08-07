// netlify/functions/ambil-user-kelas.js
const fetch = require('node-fetch');
const GITHUB_API = 'https://api.github.com/repos/dickymiswardi/usermtq/contents/user.json';
const TOKEN = process.env.MTQ_TOKEN;

exports.handler = async () => {
  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      return { statusCode: res.status, body: 'Gagal fetch user.json' };
    }

    const result = await res.json();
    const content = Buffer.from(result.content, 'base64').toString('utf-8');

    return {
      statusCode: 200,
      body: content,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
