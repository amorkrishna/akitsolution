import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egjtzpbcevotksunohep.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnanR6cGJjZXZvdGtzdW5vaGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTAwMTksImV4cCI6MjA5NDI2NjAxOX0.0VqqTel7zhnn6hOLA3HZo3rYdlM3xPTEYQegJNQ_hPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Fetching...");
  const { data, error } = await supabase.functions.invoke("product-scraper", {
    body: { url: "https://www.ryans.com/dahua-hac-b1a21-2-mp-hdcvi-ir-bullet-camera" }
  });
  
  if (error) {
    console.error("Function invoke error:", error);
  } else {
    console.log("Data:", JSON.stringify(data, null, 2));
  }
}

test();
