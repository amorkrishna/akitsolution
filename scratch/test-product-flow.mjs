import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egjtzpbcevotksunohep.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnanR6cGJjZXZvdGtzdW5vaGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTAwMTksImV4cCI6MjA5NDI2NjAxOX0.0VqqTel7zhnn6hOLA3HZo3rYdlM3xPTEYQegJNQ_hPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProductFlow() {
  console.log("1. Testing Scraper...");
  // Let's test a simple startech or ryans URL
  const testUrl = "https://www.startech.com.bd/dahua-hac-b1a21-2mp-hdcvi-ir-bullet-camera";
  
  const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke("product-scraper", {
    body: { url: testUrl }
  });

  if (scrapeError) {
    console.error("Scraper Error:", scrapeError);
    return;
  }
  
  console.log("Scraped Data:", JSON.stringify(scrapeData, null, 2));
  
  const product = scrapeData?.products?.[0];
  if (!product) {
    console.error("No product found in scraped data");
    return;
  }

  console.log("\n2. Inserting into products table...");
  const payload = {
    name: "TEST_AI_IMPORT_" + (product.name || "Test Product"),
    category: "CCTV",
    brand: "Dahua",
    description: product.description || "Test description",
    price: Number(product.price) || 0,
    stock_quantity: 10,
    show_in_store: false,
    image_url: product.image_url || null
  };

  const { data: inserted, error: insertError } = await supabase
    .from("products")
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    console.error("Insert Error:", insertError);
    return;
  }

  console.log("Inserted Product ID:", inserted.id);
  console.log("Name:", inserted.name);

  console.log("\n3. Verifying product exists in table...");
  const { data: verifyData, error: verifyError } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", inserted.id)
    .single();
    
  if (verifyError) {
    console.error("Verify Error:", verifyError);
    return;
  }
  
  console.log("Verified exists:", verifyData.name);

  console.log("\n4. Cleaning up test data...");
  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", inserted.id);

  if (deleteError) {
    console.error("Delete Error:", deleteError);
  } else {
    console.log("Test data cleaned up successfully. Flow works perfectly!");
  }
}

testProductFlow();
