import fs from 'fs';
async function test() {
  const targetUrl = "https://www.startech.com.bd/laptop";
  const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${targetUrl}`);
  const text = await res.text();
  fs.writeFileSync('scratch/laptop.html', text);
  console.log("Dumped", text.length, "bytes");
}
test();
