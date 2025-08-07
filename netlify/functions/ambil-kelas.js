const fetch = require('node-fetch');

const TOKEN = process.env.MTQ_TOKEN;

exports.handler = async () => {
  const url = 'https://api.github.com/repos/dickymiswardi/usermtq/contents';
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const data = await res.json();
    const kelasFiles = data
      .filter(file => file.name.startsWith('kelas_') && file.name.endsWith('.json'))
      .map(file => file.name.replace('.json', ''));
    return {
      statusCode: 200,
      body: JSON.stringify(kelasFiles)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
