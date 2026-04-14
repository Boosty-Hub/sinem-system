import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate caller JWT using admin client
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { app_user_id, name, email, password, role_id, status, phone, cargo, pin_code } = await req.json();

    if (!app_user_id || !name || !email) {
      return new Response(
        JSON.stringify({ error: "app_user_id, name and email are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (pin_code !== undefined && pin_code !== null && pin_code !== "" && !/^\d{4}$/.test(pin_code)) {
      return new Response(
        JSON.stringify({ error: "El PIN debe ser exactamente 4 dígitos numéricos" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get app_user to find auth_user_id
    const { data: appUser, error: fetchError } = await adminClient
      .from("app_users")
      .select("auth_user_id")
      .eq("id", app_user_id)
      .single();

    if (fetchError || !appUser) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Update auth user if auth_user_id exists
    if (appUser.auth_user_id) {
      const authUpdate: Record<string, unknown> = {
        email,
        user_metadata: { name },
      };
      if (password && password.length >= 6) {
        authUpdate.password = password;
      }

      const { error: authError } = await adminClient.auth.admin.updateUserById(
        appUser.auth_user_id,
        authUpdate
      );

      if (authError) {
        console.error("Auth update error:", authError);
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Update app_users row
    const pinUpdate = pin_code === "" ? null : (pin_code || undefined);
    const { error: updateError } = await adminClient
      .from("app_users")
      .update({
        name,
        email,
        role_id: role_id || null,
        status: status || "activo",
        phone: phone ?? null,
        cargo: cargo ?? null,
        ...(pin_code !== undefined ? { pin_code: pinUpdate } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", app_user_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
