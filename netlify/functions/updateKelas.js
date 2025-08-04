const { Octokit } = require("@octokit/rest");

exports.handler = async (event) => {
  try {
    const { filename, data } = JSON.parse(event.body);

    const octokit = new Octokit({ auth: process.env.MTQ_TOKEN });

    const owner = "dickymiswardi";
    const repo = "usermtq";
    const path = filename;
    const branch = "main";

    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    const sha = fileData.sha;

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Update ${filename}`,
      content,
      sha,
      branch
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
