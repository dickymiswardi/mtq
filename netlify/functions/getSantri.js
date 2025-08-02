export async function handler(event) {
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      kelas: event.queryStringParameters.kelas || null,
      message: "getSantri function jalan"
    })
  };
}
