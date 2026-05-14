const URL = "https://egjtzpbcevotksunohep.supabase.co/functions/v1/product-scraper";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnanR6cGJjZXZvdGtzdW5vaGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTAwMTksImV4cCI6MjA5NDI2NjAxOX0.0VqqTel7zhnn6hOLA3HZo3rYdlM3xPTEYQegJNQ_hPI";

async function test() {
  const targetUrl = "https://www.startech.com.bd/laptop";
  
  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({ url: targetUrl })
    });
    
    const data = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", data);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
