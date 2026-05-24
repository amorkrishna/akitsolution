const API_KEY = "AIzaSyB7uEBd5UQtxdlm5CCZWlFjQbHn_FrQDfg"; // From .env

async function testGemini(modelName) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }]
      }),
    });
    const data = await res.json();
    console.log(`Model ${modelName}:`, data.error ? data.error.message : "Success");
  } catch (e) {
    console.log(`Model ${modelName} request error:`, e.message);
  }
}

testGemini("gemini-2.5-flash");
testGemini("gemini-2.0-flash");
testGemini("gemini-3.5-flash");
