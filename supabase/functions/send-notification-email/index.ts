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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: corsHeaders,
      });
    }

    const { userId, title, message, link } = await req.json();

    // Fetch user data
    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: user, error: userErr } = await admin
      .from("app_users")
      .select("name, email, notif_email")
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: corsHeaders,
      });
    }

    // Double-check preference
    if (!user.notif_email) {
      return new Response(JSON.stringify({ skipped: true, reason: "Email notifications disabled" }), {
        status: 200, headers: corsHeaders,
      });
    }

    const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://sinem-system.netlify.app";
    const actionUrl = link ? `${appUrl}${link}` : appUrl;

    // Send via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "SINEM Sistema <notificaciones@sinem.com.do>",
        to: [user.email],
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0097A7; padding: 20px 30px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0; font-size: 18px;">SINEM Sistema</h2>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;">Hola <strong>${user.name}</strong>,</p>
              <h3 style="margin: 16px 0 8px 0; color: #1a1a1a; font-size: 16px;">${title}</h3>
              <p style="margin: 0 0 24px 0; color: #555; font-size: 14px; line-height: 1.6;">${message}</p>
              ${link ? `<a href="${actionUrl}" style="display: inline-block; background: #0097A7; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">Ver en el sistema →</a>` : ""}
              <hr style="margin: 28px 0; border: none; border-top: 1px solid #e5e5e5;" />
              <p style="margin: 0; color: #aaa; font-size: 11px;">
                Puedes desactivar las notificaciones por correo desde tu perfil en el sistema.<br/>
                Este mensaje fue enviado automáticamente por SINEM Sistema.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Email send failed", detail: errBody }), {
        status: 500, headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("send-notification-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders,
    });
  }
});
