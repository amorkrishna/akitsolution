const API_KEY = "AIzaSyAKWssZrpeyFGRGdNuTgSYt2E3H7aiZJVA"; // From .env

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.log("Error:", e.message);
  }
}

listModels();
