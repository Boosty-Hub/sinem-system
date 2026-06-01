import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { app_user_id } = await req.json();
    if (!app_user_id) {
      return new Response(JSON.stringify({ error: "app_user_id requerido" }), { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: appUser, error: fetchErr } = await adminClient
      .from("app_users")
      .select("auth_user_id")
      .eq("id", app_user_id)
      .maybeSingle();

    if (fetchErr || !appUser) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404, headers: corsHeaders });
    }

    if (appUser.auth_user_id) {
      const { error: authErr } = await adminClient.auth.admin.deleteUser(appUser.auth_user_id);
      if (authErr) {
        return new Response(JSON.stringify({ error: authErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    const { error: dbErr } = await adminClient.from("app_users").delete().eq("id", app_user_id);
    if (dbErr) {
      return new Response(JSON.stringify({ error: dbErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
