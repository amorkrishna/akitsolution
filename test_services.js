import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL="(.*)"/);
const projectIdMatch = envContent.match(/VITE_SUPABASE_PROJECT_ID="(.*)"/);
const anonKeyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);

const url = urlMatch[1].trim();
const projectId = projectIdMatch[1].trim();
const anonKey = anonKeyMatch[1].trim();

console.log("Project ID:", projectId);
console.log("Supabase URL:", url);

// Try to run SQL via the PostgreSQL REST endpoint with anon key
// This won't work for DDL but let's check what policies currently exist
fetch(`${url}/rest/v1/rpc/pg_policies`, {
  method: 'POST',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ tablename: 'services' })
}).then(res => {
  console.log("pg_policies status:", res.status);
  return res.text();
}).then(data => {
  console.log("Policies:", data);
}).catch(err => console.error("Error:", err));
