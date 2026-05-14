import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://egjtzpbcevotksunohep.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnanR6cGJjZXZvdGtzdW5vaGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTAwMTksImV4cCI6MjA5NDI2NjAxOX0.0VqqTel7zhnn6hOLA3HZo3rYdlM3xPTEYQegJNQ_hPI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRows() {
  const { data, error } = await supabase.from("products").select("*").limit(1);
  console.log("Data:", JSON.stringify(data, null, 2));
}

checkRows();
