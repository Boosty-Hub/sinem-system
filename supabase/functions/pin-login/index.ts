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
    const { pin } = await req.json();

    if (!pin || !/^\d{4}$/.test(pin)) {
      return new Response(JSON.stringify({ error: "PIN inválido. Debe ser 4 dígitos." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up user by PIN
    const { data: appUser, error: lookupErr } = await adminClient
      .from("app_users")
      .select("id, email, name, status")
      .eq("pin_code", pin)
      .maybeSingle();

    if (lookupErr || !appUser) {
      return new Response(JSON.stringify({ error: "PIN incorrecto" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    if (appUser.status !== "activo") {
      return new Response(JSON.stringify({ error: "Usuario inactivo. Contacta al administrador." }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Generate magic link to obtain a token_hash the client can exchange for a session
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: appUser.email,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("generateLink error:", linkErr);
      return new Response(JSON.stringify({ error: "Error al generar sesión" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        token_hash: linkData.properties.hashed_token,
        name: appUser.name,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
