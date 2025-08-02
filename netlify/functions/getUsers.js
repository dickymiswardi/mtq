// Netlify Functions: getUsers.js
export async function handler() {
  const token = process.env.MTQ_TOKEN; // Token GitHub dari Environment Variable
  const githubUrl = "https://raw.githubusercontent.com/dickymiswardi/usermtq/main/user.json";

  try {
    // Fetch dari repo privat GitHub pakai token
    const response = await fetch(githubUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Gagal fetch data: ${response.status}`);
    }

    const data = await response.text();

    return {
      statusCode: 200,
      body: data
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
