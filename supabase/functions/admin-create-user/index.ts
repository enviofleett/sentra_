import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user making the request is an admin
    // We get the JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestUser }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !requestUser) {
      throw new Error("Invalid token");
    }

    // Check if the user is an admin
    const { data: roles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestUser.id)
      .eq("role", "admin")
      .single();

    if (rolesError || !roles) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    // Note: listUsers is paginated, but searching by email is not directly supported in listUsers filter efficiently in all versions
    // But we can try to create and catch error, or just use createUser which fails if exists?
    // actually createUser with existing email might return error.
    
    // Let's try to create the user.
    // We generate a random password because we are creating a user on their behalf.
    // In a real flow, we might send an invite email.
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto confirm since admin created it
      user_metadata: { full_name: fullName }
    });

    if (createError) {
      // If user already exists, we might want to return that user.
      // But createUser returns error if email exists.
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The trigger should handle profile creation.
    // But we can double check or update if needed.
    // If we want to ensure the name is set correctly even if trigger failed (unlikely), we could upsert to profiles.
    
    if (newUser.user && fullName) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
            id: newUser.user.id,
            email: email,
            full_name: fullName,
            updated_at: new Date().toISOString()
        });
        
      if (profileError) {
        console.error("Error updating profile:", profileError);
      }
    }

    return new Response(
      JSON.stringify(newUser.user),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
