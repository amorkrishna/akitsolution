const API_KEY = "AIzaSyAKWssZrpeyFGRGdNuTgSYt2E3H7aiZJVA"; // From .env

async function testGemini(modelName) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`, {
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

testGemini("gemini-1.5-flash");
testGemini("gemini-1.5-flash-latest");
testGemini("gemini-1.5-pro");
testGemini("gemini-1.5-flash-8b");
testGemini("gemini-1.5-pro-latest");
testGemini("gemini-pro");
