import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://egjtzpbcevotksunohep.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnanR6cGJjZXZvdGtzdW5vaGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTAwMTksImV4cCI6MjA5NDI2NjAxOX0.0VqqTel7zhnn6hOLA3HZo3rYdlM3xPTEYQegJNQ_hPI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from("products").insert({
    name: "Test Scraper Product",
    description: "This is a test product",
    price: 1500,
    category: "Laptop",
    brand: "HP",
    show_in_store: false,
    image_url: "https://example.com/test.jpg",
    stock_quantity: 10,
    discount_percentage: 0
  });

  if (error) {
    console.error("Insert failed:", JSON.stringify(error, null, 2));
  } else {
    console.log("Insert success");
  }
}

testInsert();
