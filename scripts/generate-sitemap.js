import fs from 'fs';
import path from 'path';

// Since we run this during build, we can read .env directly or it might be in process.env
const envPath = path.resolve(process.cwd(), '.env');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
  console.warn('.env file not found, assuming CI environment variables.');
}

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}="(.*)"$`, 'm')) || envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1] : process.env[key];
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

const SITE_URL = 'https://akitsolution.store';

async function fetchFromSupabase(table) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(`Supabase credentials missing. Cannot fetch ${table}.`);
    return [];
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${table}:`, await response.text());
      return [];
    }
    
    return await response.json();
  } catch (err) {
    console.error(`Error fetching ${table}:`, err);
    return [];
  }
}

async function generateSitemap() {
  console.log('Generating dynamic sitemap...');
  const products = await fetchFromSupabase('products');
  const services = await fetchFromSupabase('services');

  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Static Pages -->
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${today}</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/?tab=services</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <lastmod>${today}</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/?tab=packages</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>
`;

  // Dynamic Product Pages
  if (products && products.length > 0) {
    xml += `\n  <!-- Products -->\n`;
    for (const product of products) {
      xml += `  <url>
    <loc>${SITE_URL}/?product=${product.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>\n`;
    }
  }

  // Dynamic Service Pages
  if (services && services.length > 0) {
    xml += `\n  <!-- Services -->\n`;
    for (const service of services) {
      xml += `  <url>
    <loc>${SITE_URL}/?service=${service.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <lastmod>${today}</lastmod>
  </url>\n`;
    }
  }

  xml += `</urlset>`;

  const publicPath = path.resolve(process.cwd(), 'public');
  const destPath = path.resolve(publicPath, 'sitemap.xml');
  
  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
  }

  fs.writeFileSync(destPath, xml);
  console.log(`✅ Sitemap successfully generated at ${destPath} with ${products.length} products and ${services.length} services.`);
}

generateSitemap().catch(console.error);
