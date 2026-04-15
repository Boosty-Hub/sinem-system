import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  crm:       { label: "CRM",          color: "#7C3AED", icon: "💼" },
  task:      { label: "Tarea",        color: "#0284C7", icon: "✅" },
  project:   { label: "Proyecto",     color: "#0369A1", icon: "📁" },
  quotation: { label: "Cotización",   color: "#B45309", icon: "📄" },
  client:    { label: "Cliente",      color: "#065F46", icon: "🏢" },
  mention:   { label: "Mención",      color: "#BE185D", icon: "💬" },
  info:      { label: "Info",         color: "#374151", icon: "ℹ️"  },
};

function buildHtml(opts: {
  userName: string;
  title: string;
  message: string;
  actionUrl: string | null;
  type: string;
  logoUrl: string | null;
  appUrl: string;
}): string {
  const meta = TYPE_META[opts.type] ?? TYPE_META["info"];
  const logoBlock = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="Logo" style="max-height:48px; max-width:180px; display:block;" />`
    : `<span style="font-size:20px; font-weight:700; color:#ffffff; letter-spacing:-0.5px;">SINEM</span>`;

  const ctaBlock = opts.actionUrl
    ? `<a href="${opts.actionUrl}"
         style="display:inline-block; margin-top:24px; background:${meta.color}; color:#ffffff;
                padding:12px 28px; border-radius:8px; text-decoration:none;
                font-size:14px; font-weight:600; letter-spacing:0.2px;">
         Ver en el sistema →
       </a>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header with logo -->
        <tr>
          <td style="background:#111827;padding:24px 32px;">
            ${logoBlock}
          </td>
        </tr>

        <!-- Type badge strip -->
        <tr>
          <td style="background:${meta.color};padding:8px 32px;">
            <span style="color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;">
              ${meta.icon}&nbsp; ${meta.label}
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 32px 40px;">
            <p style="margin:0 0 6px;font-size:14px;color:#6B7280;">
              Hola, <strong style="color:#111827;">${opts.userName}</strong>
            </p>

            <h2 style="margin:16px 0 10px;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">
              ${opts.title}
            </h2>

            <p style="margin:0;font-size:15px;color:#4B5563;line-height:1.7;">
              ${opts.message}
            </p>

            ${ctaBlock}
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="background:#ffffff;padding:0 32px;">
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:0;" />
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#ffffff;padding:20px 32px 28px;border-radius:0 0 12px 12px;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">
              Puedes desactivar las notificaciones por correo desde
              <a href="${opts.appUrl}/perfil" style="color:#9CA3AF;">tu perfil</a>
              en el sistema.<br/>
              Este mensaje fue enviado automáticamente — por favor no respondas a este correo.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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

    const { userId, title, message, link, type = "info" } = await req.json();

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user + company logo in parallel
    const [userRes, logoRes] = await Promise.all([
      admin.from("app_users").select("name, email, notif_email").eq("id", userId).single(),
      admin.from("general_settings").select("value").eq("key", "company_logo_url").maybeSingle(),
    ]);

    if (userRes.error || !userRes.data) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: corsHeaders,
      });
    }

    const user = userRes.data;

    if (!user.notif_email) {
      return new Response(JSON.stringify({ skipped: true, reason: "Email notifications disabled" }), {
        status: 200, headers: corsHeaders,
      });
    }

    const logoUrl: string | null = logoRes.data?.value ?? null;
    const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://sinem-system.netlify.app";
    const actionUrl = link ? `${appUrl}${link}` : null;

    const html = buildHtml({
      userName: user.name,
      title,
      message,
      actionUrl,
      type,
      logoUrl,
      appUrl,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "SINEM Sistema <no-reply@app.sinem.energy>",
        to: [user.email],
        subject: title,
        html,
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
