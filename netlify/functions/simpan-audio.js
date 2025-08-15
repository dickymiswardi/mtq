const fetch = require('node-fetch');

exports.handler = async (event) => {
    try {
        const boundary = event.headers['content-type'].split('boundary=')[1];
        const body = Buffer.from(event.body, 'base64');

        // 🛠 Contoh: simpan langsung ke GitHub repo privat
        const res = await fetch(`https://api.github.com/repos/USERNAME/REPO/contents/audio/${Date.now()}.webm`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "Upload audio",
                content: body.toString('base64')
            })
        });

        const data = await res.json();
        return {
            statusCode: 200,
            body: JSON.stringify({ url: data.content.download_url })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
