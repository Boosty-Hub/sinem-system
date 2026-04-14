import { useParams, useSearchParams } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { CURRENCIES, type ProposalSettings, type Quotation } from "@/lib/types";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2pdf from "html2pdf.js";
import { supabase } from "@/lib/supabase";

const PAGE_STYLE: React.CSSProperties = {
  fontFamily: "'Inter', Arial, sans-serif",
  color: "#1a1a1a",
  fontSize: "13px",
  lineHeight: "1.7",
  padding: "45px 55px 30px 55px",
  position: "relative",
  minHeight: "1056px",
  display: "flex",
  flexDirection: "column",
};

const FOOTER_STYLE: React.CSSProperties = {
  marginTop: "auto",
  borderTop: "1px solid #ccc",
  paddingTop: "10px",
  fontSize: "10px",
  color: "#888",
  lineHeight: "1.4",
};

const dbToSettings = (row: any): ProposalSettings => ({
  companyName: row.company_name ?? "",
  companyAddress: row.company_address ?? "",
  companyPhone: row.company_phone ?? "",
  companyEmail: row.company_email ?? "",
  companyWebsite: row.company_website ?? "",
  companyRnc: row.company_rnc ?? "",
  logoUrl: row.logo_url ?? "",
  defaultItbisPercent: row.default_itbis_percent ?? 18,
  greetingText: row.greeting_text ?? "",
  warrantyText: row.warranty_text ?? "",
  responsibilityText: row.responsibility_text ?? "",
  risksText: row.risks_text ?? "",
  installationText: row.installation_text ?? "",
  validityText: row.validity_text ?? "",
  returnsText: row.returns_text ?? "",
  legalClauses: row.legal_clauses ?? "",
  purchaseOrderInfo: row.purchase_order_info ?? "",
  closingText: row.closing_text ?? "",
  coverIntroText: row.cover_intro_text ?? "",
  coverPartnerText: row.cover_partner_text ?? "",
  coverClosingText: row.cover_closing_text ?? "",
  signatureName: row.signature_name ?? "",
  signatureTitle: row.signature_title ?? "",
  signaturePhone: row.signature_phone ?? "",
  signatureEmail: row.signature_email ?? "",
  signatureImageUrl: row.signature_image_url ?? "",
  footerText: row.footer_text ?? "",
});

const OfertaPublica = () => {
  const { id } = useParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [s, setS] = useState<ProposalSettings | null>(null);
  const [companyLogoFromSettings, setCompanyLogoFromSettings] = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [approver, setApprover] = useState<{ name: string; cargo: string; phone: string; email: string; signatureImageUrl: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      // Fetch quotation, line items, settings, and general settings in parallel
      const [{ data: qRow }, { data: liRows }, { data: settingsRow }, { data: gsRow }] = await Promise.all([
        supabase.from("quotations").select("*").eq("id", id).single(),
        supabase.from("quotation_line_items").select("*").eq("quotation_id", id).order("sort_order"),
        supabase.from("proposal_settings").select("*").limit(1).single(),
        supabase.from("general_settings").select("value").eq("key", "company_logo_url").maybeSingle(),
      ]);

      if (qRow) {
        const lineItems = (liRows ?? []).map((li: any) => ({
          id: li.id,
          description: li.description,
          quantity: li.quantity,
          unitPriceUSD: Number(li.unit_price_usd),
          totalUSD: Number(li.total_usd),
        }));

        setQuotation({
          id: qRow.id,
          code: qRow.code,
          prospectId: qRow.prospect_id ?? undefined,
          clientId: qRow.client_id ?? undefined,
          contactId: qRow.contact_id ?? undefined,
          createdBy: qRow.created_by ?? undefined,
          subject: qRow.subject,
          client: {
            company: qRow.client_company,
            attention: qRow.client_attention,
            address: qRow.client_address,
            phone: qRow.client_phone,
            email: qRow.client_email,
            rnc: qRow.client_rnc,
          },
          lineItems,
          subtotalUSD: Number(qRow.subtotal_usd),
          applyItbis: qRow.apply_itbis,
          itbisPercent: Number(qRow.itbis_percent),
          itbisUSD: Number(qRow.itbis_usd),
          totalUSD: Number(qRow.total_usd),
          currency: qRow.currency as any,
          exchangeRate: Number(qRow.exchange_rate),
          partner: (qRow as any).partner ?? "Siemens",
          costUSD: Number(qRow.cost_usd),
          marginPercent: Number(qRow.margin_percent),
          marginUSD: Number(qRow.margin_usd),
          paymentTerms: qRow.payment_terms,
          deliveryTerms: qRow.delivery_terms as any,
          deliveryWeeksMin: qRow.delivery_weeks_min,
          deliveryWeeksMax: qRow.delivery_weeks_max,
          validityDays: qRow.validity_days,
          deliveryLocation: qRow.delivery_location,
          notes: qRow.notes,
          status: qRow.status as any,
          createdAt: qRow.created_at?.split("T")[0] ?? "",
          version: qRow.version,
          history: [],
          approvalStatus: qRow.approval_status as any,
          approvedBy: qRow.approved_by ?? undefined,
          approvedAt: qRow.approved_at ?? undefined,
          approvalNote: qRow.approval_note ?? undefined,
        });
      }

      if (settingsRow) setS(dbToSettings(settingsRow));
      if (gsRow?.value) setCompanyLogoFromSettings(gsRow.value);

      // Load approver data if quotation is approved
      if (qRow?.approved_by) {
        const { data: approverRow } = await supabase
          .from("app_users")
          .select("name, cargo, phone, email, signature_image_url")
          .eq("auth_user_id", qRow.approved_by)
          .maybeSingle();
        if (approverRow) {
          setApprover({
            name: approverRow.name ?? "",
            cargo: (approverRow as any).cargo ?? "",
            phone: approverRow.phone ?? "",
            email: approverRow.email ?? "",
            signatureImageUrl: (approverRow as any).signature_image_url ?? "",
          });
        }
      }

      setLoadingSettings(false);
    };
    load();
  }, [id]);

  const isApproved = quotation?.approvalStatus === "approved";
  // Use approver's data when available, fall back to proposal_settings
  const sigName  = (isApproved && approver?.name)  ? approver.name  : s?.signatureName  ?? "";
  const sigTitle = (isApproved && approver?.cargo)  ? approver.cargo : s?.signatureTitle ?? "";
  const sigPhone = (isApproved && approver?.phone)  ? approver.phone : s?.signaturePhone ?? "";
  const sigEmail = (isApproved && approver?.email)  ? approver.email : s?.signatureEmail ?? "";
  // Approver's personal signature image takes priority over the global one
  const sigImageUrl = (isApproved && approver?.signatureImageUrl) ? approver.signatureImageUrl : s?.signatureImageUrl ?? "";
  const qCurrency = quotation?.currency ?? "USD";
  const qRate = quotation?.exchangeRate ?? 1;
  const qIsOriginal = quotation?.isOriginalCurrency ?? false;
  const currCfg = CURRENCIES.find((c) => c.key === qCurrency) ?? CURRENCIES[0];
  const fmt = (amount: number) => {
    if (qIsOriginal) return `${currCfg.symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (qCurrency === "USD") return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${currCfg.symbol}${(amount * qRate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const qPartner = quotation?.partner ?? "Siemens";
  const replacePartner = (text: string) => text.replace(/SIEMENS|Siemens|siemens/g, qPartner);

  // Auto-download PDF when ?download=true (hooks must be before early returns)
  const [searchParams] = useSearchParams();
  const autoDownload = searchParams.get("download") === "true";
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  const handleDownloadPDF = () => {
    if (!contentRef.current || !quotation) return;
    const opt = {
      margin: [10, 15, 10, 15] as [number, number, number, number],
      filename: `${quotation.code}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm" as const, format: "letter", orientation: "portrait" as const },
    };
    html2pdf().set(opt).from(contentRef.current).save();
  };

  useEffect(() => {
    if (autoDownload && !downloadTriggered && contentRef.current && quotation) {
      const timer = setTimeout(() => {
        handleDownloadPDF();
        setDownloadTriggered(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [autoDownload, downloadTriggered, quotation]);

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!quotation || !s) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-500">Oferta no encontrada</p>
      </div>
    );
  }

  const formatDateLong = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDate();
    const month = d.toLocaleDateString("es-DO", { month: "long" });
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    const year = d.getFullYear();
    return `${day} de ${monthCap} del ${year}`;
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  const PageFooter = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
    <div style={FOOTER_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ whiteSpace: "pre-line" }}>{s.footerText}</div>
        <div style={{ fontSize: "11px", color: "#666", whiteSpace: "nowrap", marginLeft: "20px" }}>{pageNum}</div>
      </div>
    </div>
  );

  const PageHeader = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
      <img src={companyLogoFromSettings || s.logoUrl} alt="SINEM" style={{ height: "55px" }} />
      <div style={{ textAlign: "right", fontSize: "11px", color: "#555", lineHeight: "1.4" }}>
        <p style={{ margin: 0, fontWeight: 500 }}>{quotation.code}</p>
        <p style={{ margin: "2px 0 0 0" }}>{formatDateShort(quotation.createdAt)}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm print:hidden">
        <div className="max-w-[816px] mx-auto flex items-center justify-between py-3 px-4">
          <span className="text-sm font-semibold text-gray-700">
            {quotation.code} — {quotation.client.company}
          </span>
          <Button onClick={handleDownloadPDF} size="sm">
            <Download className="h-4 w-4 mr-2" /> Descargar PDF
          </Button>
        </div>
      </div>

      {/* Offer Content */}
      <div className="max-w-[816px] mx-auto my-8 print:my-0" ref={contentRef}>

        {/* ═══════════════════════════════════════════════════════════════
            PAGE 1 — COVER LETTER (matches PDF exactly)
        ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-white shadow-lg print:shadow-none mb-8" style={PAGE_STYLE}>
          {/* Header: Logo left, code+date right */}
          <PageHeader />

          {/* Right-aligned info block */}
          <div style={{ textAlign: "right", marginTop: "40px", marginBottom: "40px", fontSize: "13px", lineHeight: "1.8" }}>
            <p style={{ margin: 0 }}>{formatDateLong(quotation.createdAt)}</p>
            <p style={{ margin: 0 }}>Asunto: {quotation.subject}</p>
            <p style={{ margin: 0 }}>De: {sigName}</p>
            <p style={{ margin: 0 }}>Para: {quotation.client.attention}</p>
            <p style={{ margin: 0 }}>No. de oferta: {quotation.code}</p>
          </div>

          {/* Greeting */}
          <p style={{ margin: "0 0 30px 0", fontSize: "13px" }}>
            Estimada {quotation.client.attention}:
          </p>

          {/* Body paragraphs */}
          <p style={{ margin: "0 0 22px 0", fontSize: "13px", textAlign: "justify" }}>
            {replacePartner(s.coverIntroText)}
          </p>
          <p style={{ margin: "0 0 22px 0", fontSize: "13px", textAlign: "justify" }}>
            {replacePartner(s.coverPartnerText)}
          </p>
          <p style={{ margin: "0 0 30px 0", fontSize: "13px", textAlign: "justify" }}>
            {s.coverClosingText}
          </p>

          {/* Atentamente */}
          <p style={{ margin: "0 0 15px 0", fontSize: "13px" }}>Atentamente,</p>

          {isApproved ? (
            <>
              {/* Signature block with overlay effect */}
              <div style={{ position: "relative" }}>
                {sigImageUrl && (
                  <img
                    src={sigImageUrl}
                    alt="Firma"
                    style={{
                      display: "block",
                      height: "60px",
                      maxWidth: "220px",
                      objectFit: "contain",
                      objectPosition: "left bottom",
                      position: "relative",
                      zIndex: 2,
                      marginBottom: "-18px",
                      opacity: 0.92,
                      mixBlendMode: "multiply",
                    }}
                  />
                )}
                {!sigImageUrl && <div style={{ height: "20px" }} />}

                {/* Signature block: two columns — sits under the image */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "13px", margin: "0 0 2px 0" }}>{sigName}</p>
                    <p style={{ fontSize: "13px", margin: "0 0 2px 0", color: "#333" }}>{sigTitle}</p>
                    <p style={{ fontSize: "13px", margin: 0, color: "#333" }}>{s.companyName}</p>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: "13px", margin: "0 0 2px 0", color: "#333" }}>{sigPhone}</p>
                    <p style={{ fontSize: "13px", margin: "0 0 2px 0", color: "#0097A7" }}>{sigEmail}</p>
                    <p style={{ fontSize: "13px", margin: 0, color: "#333" }}>{s.companyWebsite}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "15px 0", color: "#999", fontSize: "12px", fontStyle: "italic" }}>
              Esta cotización está pendiente de aprobación interna. La firma autorizada se mostrará una vez aprobada.
            </div>
          )}

          {/* Page 1 Footer */}
          <PageFooter pageNum={1} totalPages={2} />
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PAGE 2+ — TECHNICAL & COMMERCIAL PROPOSAL
        ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-white shadow-lg print:shadow-none mb-8" style={PAGE_STYLE}>
          <PageHeader />

          {/* Greeting */}
          <p style={{ margin: "15px 0 20px 0", fontSize: "13px" }}>{s.greetingText}</p>

          {/* Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px" }}>
            <thead>
              <tr style={{ backgroundColor: "#0097A7", color: "white" }}>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "11px", fontWeight: 600, width: "36px" }}>No.</th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600 }}>Descripción</th>
                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "11px", fontWeight: 600, width: "55px" }}>Cant.</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: "11px", fontWeight: 600, width: "105px" }}>P. Unit. {qCurrency}</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontSize: "11px", fontWeight: 600, width: "105px" }}>Total {qCurrency}</th>
              </tr>
            </thead>
            <tbody>
              {quotation.lineItems.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e5e5e5", backgroundColor: i % 2 === 0 ? "#fafafa" : "white" }}>
                  <td style={{ padding: "9px 12px", textAlign: "center", fontSize: "12px" }}>{i + 1}</td>
                  <td style={{ padding: "9px 12px", fontSize: "12px" }} dangerouslySetInnerHTML={{ __html: item.description }} />
                  <td style={{ padding: "9px 12px", textAlign: "center", fontSize: "12px" }}>{item.quantity}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "12px" }}>{fmt(item.unitPriceUSD)}</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "12px", fontWeight: 600 }}>{fmt(item.totalUSD)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "25px" }}>
            <table style={{ borderCollapse: "collapse", minWidth: "270px" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "7px 14px", fontWeight: 600, fontSize: "12px" }}>Subtotal:</td>
                  <td style={{ padding: "7px 14px", textAlign: "right", fontSize: "12px" }}>{fmt(quotation.subtotalUSD)}</td>
                </tr>
                {quotation.applyItbis && (
                  <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "7px 14px", fontWeight: 600, fontSize: "12px" }}>ITBIS ({quotation.itbisPercent}%):</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", fontSize: "12px" }}>{fmt(quotation.itbisUSD)}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: "#0097A7" }}>
                  <td style={{ padding: "9px 14px", fontWeight: 700, fontSize: "13px", color: "white" }}>Total General:</td>
                  <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, fontSize: "13px", color: "white" }}>{fmt(quotation.totalUSD)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {qCurrency !== "USD" && !qIsOriginal && (
            <p style={{ fontSize: "10px", color: "#888", margin: "-10px 0 15px 0", textAlign: "right" }}>
              Tasa de cambio aplicada: 1 USD = {qRate} {qCurrency}
            </p>
          )}

          {quotation.notes && (
            <div style={{ marginBottom: "20px", padding: "10px 14px", backgroundColor: "#f8f9fa", borderLeft: "3px solid #0097A7", borderRadius: "4px" }}>
              <p style={{ fontWeight: 600, fontSize: "11px", color: "#555", margin: "0 0 3px 0" }}>Notas:</p>
              <p style={{ margin: 0, fontSize: "12px" }}>{quotation.notes}</p>
            </div>
          )}

          {/* Commercial Terms */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "10px", borderBottom: "2px solid #0097A7", paddingBottom: "5px" }}>
              Condiciones Comerciales
            </h3>
            <table style={{ fontSize: "12px", borderCollapse: "collapse", width: "100%" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ fontWeight: 600, padding: "6px 0", width: "170px", color: "#555" }}>Moneda:</td>
                  <td style={{ padding: "6px 0" }}>Dólares Americanos (USD)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ fontWeight: 600, padding: "6px 0", color: "#555" }}>Forma de Pago:</td>
                  <td style={{ padding: "6px 0" }}>{quotation.paymentTerms}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ fontWeight: 600, padding: "6px 0", color: "#555" }}>Condiciones de Entrega:</td>
                  <td style={{ padding: "6px 0" }}>{quotation.deliveryTerms ?? "—"}</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ fontWeight: 600, padding: "6px 0", color: "#555" }}>Tiempo de Entrega:</td>
                  <td style={{ padding: "6px 0" }}>{quotation.deliveryWeeksMin}-{quotation.deliveryWeeksMax} semanas</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ fontWeight: 600, padding: "6px 0", color: "#555" }}>Validez de la Oferta:</td>
                  <td style={{ padding: "6px 0" }}>{quotation.validityDays} días</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ fontWeight: 600, padding: "6px 0", color: "#555" }}>Lugar de Entrega:</td>
                  <td style={{ padding: "6px 0" }}>{quotation.deliveryLocation}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Garantía */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0097A7", marginBottom: "8px" }}>Garantía</h3>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{s.warrantyText}</div>
          </div>

          {/* Responsabilidad */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0097A7", marginBottom: "8px" }}>Responsabilidad</h3>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{s.responsibilityText}</div>
          </div>

          {/* Riesgos */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0097A7", marginBottom: "8px" }}>Riesgos</h3>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{s.risksText}</div>
          </div>

          {/* Instalación */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0097A7", marginBottom: "8px" }}>Instalación</h3>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{s.installationText}</div>
          </div>

          {/* Vigencia de la propuesta */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0097A7", marginBottom: "8px" }}>Vigencia de la propuesta</h3>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>
              La presente oferta tiene una vigencia de <strong>{quotation.validityDays} días</strong> a partir de la fecha de emisión.
              {s.validityText ? ` ${s.validityText}` : ""}
            </div>
          </div>

          {/* Devoluciones y/o cancelaciones */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0097A7", marginBottom: "8px" }}>Devoluciones y/o cancelaciones</h3>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{s.returnsText}</div>
          </div>

          {/* Términos y Condiciones */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0097A7", marginBottom: "8px", borderBottom: "2px solid #0097A7", paddingBottom: "4px" }}>
              Términos y Condiciones
            </h3>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{s.legalClauses}</div>
          </div>

          {/* Datos para Orden de Compra */}
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "12px", margin: "0 0 10px 0", lineHeight: "1.7" }}>
              En caso de ser favorecidos con su pedido, les agradeceremos emitir la orden de compra a nombre de:
            </p>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.8", fontWeight: 500 }}>{s.purchaseOrderInfo}</div>
            <div style={{ marginTop: "14px", fontSize: "12px", lineHeight: "1.7" }}>
              <p style={{ margin: "0 0 2px 0" }}>Con atención a {sigName}</p>
              <p style={{ margin: "0 0 2px 0" }}>Teléfono: {sigPhone}</p>
              <p style={{ margin: 0 }}>{sigEmail}</p>
            </div>
          </div>

          {/* Closing text */}
          <p style={{ fontSize: "12px", margin: "0 0 30px 0", lineHeight: "1.7" }}>{s.closingText}</p>

          {/* Atentamente + Signature */}
          <p style={{ margin: "0 0 12px 0", fontSize: "13px" }}>Atentamente,</p>
          {isApproved ? (
            <div style={{ position: "relative" }}>
              {sigImageUrl && (
                <img
                  src={sigImageUrl}
                  alt="Firma"
                  style={{
                    display: "block",
                    height: "60px",
                    maxWidth: "220px",
                    objectFit: "contain",
                    objectPosition: "left bottom",
                    position: "relative",
                    zIndex: 2,
                    marginBottom: "-18px",
                    opacity: 0.92,
                    mixBlendMode: "multiply",
                  }}
                />
              )}
              {!sigImageUrl && <div style={{ height: "20px" }} />}
              <div style={{ position: "relative", zIndex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: "13px", margin: "0 0 2px 0" }}>{sigName}</p>
                <p style={{ fontSize: "13px", margin: "0 0 2px 0", color: "#333" }}>{sigTitle}</p>
                <p style={{ fontSize: "13px", margin: 0, color: "#333" }}>{s.companyName}</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: "15px 0", color: "#999", fontSize: "12px", fontStyle: "italic" }}>
              Esta cotización está pendiente de aprobación interna. La firma autorizada se mostrará una vez aprobada.
            </div>
          )}

          {/* Page Footer */}
          <PageFooter pageNum={2} totalPages={2} />
        </div>
      </div>
    </div>
  );
};

export default OfertaPublica;
