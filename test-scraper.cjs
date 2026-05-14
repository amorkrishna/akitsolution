async function test() {
  console.log("Testing Edge Function (Live)...");
  try {
    const res = await fetch('https://egjtzpbcevotksunohep.supabase.co/functions/v1/product-scraper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: 'mouse' })
    });
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
