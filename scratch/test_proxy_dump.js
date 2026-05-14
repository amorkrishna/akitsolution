import fs from 'fs';
async function dumpProxy() {
  const targetUrl = "https://www.startech.com.bd/intel-core-i5-12400-processor";
  const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${targetUrl}`);
  const text = await res.text();
  fs.writeFileSync('scratch/dump.html', text);
  console.log("Dumped", text.length, "bytes to scratch/dump.html");
}
dumpProxy();
