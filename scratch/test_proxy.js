async function testProxy() {
  const targetUrl = "https://www.startech.com.bd/intel-core-i5-12400-processor";
  
  console.log("Testing direct fetch...");
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    console.log("Direct status:", res.status);
    if(res.ok) console.log("Direct success! Length:", (await res.text()).length);
  } catch (e) {
    console.log("Direct error:", e.message);
  }

  console.log("Testing codetabs proxy...");
  try {
    const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${targetUrl}`);
    console.log("codetabs status:", res.status);
    if(res.ok) console.log("codetabs success! Length:", (await res.text()).length);
  } catch (e) {
    console.log("codetabs error:", e.message);
  }

  console.log("Testing allorigins proxy...");
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
    console.log("allorigins status:", res.status);
    if(res.ok) {
       const text = await res.text();
       console.log("allorigins success! Length:", text.length, "Is JSON:", text.startsWith("{"));
    }
  } catch (e) {
    console.log("allorigins error:", e.message);
  }
}

testProxy();
