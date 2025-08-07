const fetch = require('node-fetch');
const token = process.env.MTQ_TOKEN;

exports.handler = async () => {
  const url = `https://api.github.com/repos/dickymiswardi/usermtq/contents/user.json`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const json = await res.json();
    const content = Buffer.from(json.content, 'base64').toString('utf-8');

    return {
      statusCode: 200,
      body: content
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
