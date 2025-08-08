const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { password } = JSON.parse(event.body);
  const url = 'https://raw.githubusercontent.com/dickymiswardi/usermtq/main/secure.json';

  const res = await fetch(url);
  const data = await res.json();

  if (password === data.adminPassword) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } else {
    return { statusCode: 403, body: JSON.stringify({ success: false }) };
  }
};
