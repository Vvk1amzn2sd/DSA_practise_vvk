const functions = require("firebase-functions");
const fetch = require("node-fetch");

exports.runCode = functions.https.onRequest(async (req, res) => {
  const { language_id, source_code, stdin } = req.body;

  try {
    const response = await fetch(
      "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
          "x-rapidapi-key": functions.config().judge0.key,
        },
        body: JSON.stringify({
          language_id,
          source_code,
          stdin,
        }),
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Execution failed", details: error.message });
  }
});
