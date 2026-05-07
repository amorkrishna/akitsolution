import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    // Verify the caller is an admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabaseClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    // Check admin role
    const { data: callerRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (callerRole?.role !== "admin" && callerRole?.role !== "ceo") throw new Error("Not authorized - admin or CEO only");

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id is required");
    if (user_id === caller.id) throw new Error("Cannot delete your own account");

    // Use service role to delete the auth user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get email before deleting anything
    const { data: profile } = await supabaseAdmin.from("profiles").select("email").eq("id", user_id).single();
    
    // Delete from user_roles first
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
    // Delete from profiles
    await supabaseAdmin.from("profiles").delete().eq("id", user_id);
    // Delete from employees by email match
    if (profile?.email) {
      await supabaseAdmin.from("employees").delete().eq("email", profile.email);
    }
    // Delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
