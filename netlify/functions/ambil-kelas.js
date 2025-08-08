const fetch = require('node-fetch');

exports.handler = async function () {
  const token = process.env.MTQ_TOKEN;
  const folderUrl = `https://api.github.com/repos/dickymiswardi/usermtq/contents`;

  const res = await fetch(folderUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  const files = await res.json();
  const kelas = files
    .filter(f => f.name.startsWith('kelas_') && f.name.endsWith('.json'))
    .map(f => f.name.replace('.json', ''));

  return {
    statusCode: 200,
    body: JSON.stringify(kelas)
  };
};
