import { useParams, useSearchParams } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { CURRENCIES, type ProposalSettings, type Quotation } from "@/lib/types";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";

// Letter page: 816 × 1056px at 96dpi. Each page div matches this exactly.
const PAGE_W = 816;
const PAGE_H = 1056;
const PAD_H = 45; // top padding
const PAD_V = 55; // side padding
const PAD_B = 30; // bottom padding
const HEADER_H = 72;  // logo (55px) + 10px margin-bottom + some gap
const FOOTER_H = 44;  // border + text + padding

const PAGE_STYLE: React.CSSProperties = {
  fontFamily: "'Inter', Arial, sans-serif",
  color: "#1a1a1a",
  fontSize: "13px",
  lineHeight: "1.7",
  width: `${PAGE_W}px`,
  minHeight: `${PAGE_H}px`,
  padding: `${PAD_H}px ${PAD_V}px ${PAD_B}px ${PAD_V}px`,
  position: "relative",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
};

const FOOTER_STYLE: React.CSSProperties = {
  marginTop: "auto",
  paddingTop: "8px",
  borderTop: "1px solid #ccc",
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
            gender: ((qRow as any).client_gender ?? "Sra.") as "Sr." | "Sra.",
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
          deliveryTimeNote: (qRow as any).delivery_time_note ?? "",
          validityDays: qRow.validity_days,
          deliveryLocation: qRow.delivery_location,
          specialConsiderations: (qRow as any).special_considerations ?? "",
          notes: qRow.notes,
          status: qRow.status as any,
          createdAt: ((qRow as any).updated_at ?? qRow.created_at)?.split("T")[0] ?? "",
          version: qRow.version,
          history: [],
          approvalStatus: qRow.approval_status as any,
          approvedBy: qRow.approved_by ?? undefined,
          approvedAt: qRow.approved_at ?? undefined,
          approvalNote: qRow.approval_note ?? undefined,
          proposalTexts: (qRow as any).proposal_texts ?? undefined,
          distributedCosts: ((qRow as any).distributed_costs ?? []) as any,
        });
      }

      if (settingsRow) setS(dbToSettings(settingsRow));
      if (gsRow?.value) setCompanyLogoFromSettings(gsRow.value);

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
  const sigName  = (isApproved && approver?.name)  ? approver.name  : s?.signatureName  ?? "";
  const sigTitle = (isApproved && approver?.cargo)  ? approver.cargo : s?.signatureTitle ?? "";
  const sigPhone = (isApproved && approver?.phone)  ? approver.phone : s?.signaturePhone ?? "";
  const sigEmail = (isApproved && approver?.email)  ? approver.email : s?.signatureEmail ?? "";
  const sigImageUrl = (isApproved && approver?.signatureImageUrl) ? approver.signatureImageUrl : s?.signatureImageUrl ?? "";

  // Merge per-quotation text overrides with global proposal settings
  const pt = quotation?.proposalTexts;
  const eff: ProposalSettings | null = s ? {
    ...s,
    greetingText: pt?.greetingText || s.greetingText,
    warrantyText: pt?.warrantyText || s.warrantyText,
    responsibilityText: pt?.responsibilityText || s.responsibilityText,
    risksText: pt?.risksText || s.risksText,
    installationText: pt?.installationText || s.installationText,
    validityText: pt?.validityText || s.validityText,
    returnsText: pt?.returnsText || s.returnsText,
    legalClauses: pt?.legalClauses || s.legalClauses,
    closingText: pt?.closingText || s.closingText,
  } : null;
  const clientSubtotal = quotation?.subtotalUSD ?? 0;
  const clientItbis = quotation?.applyItbis ? Math.round(clientSubtotal * (quotation?.itbisPercent ?? 18) / 100 * 100) / 100 : 0;
  const clientTotal = clientSubtotal + clientItbis;

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

  const [searchParams] = useSearchParams();
  const autoDownload = searchParams.get("download") === "true";
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  // Letter: 215.9 × 279.4 mm — matches PAGE_W × PAGE_H at 96 dpi
  const PDF_W_MM = 215.9;
  const PDF_H_MM = 279.4;
  const SCALE = 2;
  const PAGE_W_PX = PAGE_W * SCALE;
  const PAGE_H_PX = PAGE_H * SCALE;

  const handleDownloadPDF = async () => {
    if (!contentRef.current || !quotation) return;

    const pageEls = Array.from(
      contentRef.current.querySelectorAll<HTMLElement>(".pdf-page")
    );
    if (pageEls.length === 0) return;

    const pdf = new jsPDF({
      unit: "mm",
      format: "letter",
      orientation: "portrait",
      compress: true,
    });

    for (let i = 0; i < pageEls.length; i++) {
      const pageEl = pageEls[i];

      // Measure header/footer boundaries in CSS px relative to page div top
      const pageRect  = pageEl.getBoundingClientRect();
      const headerEl  = pageEl.querySelector<HTMLElement>(".pdf-header");
      const footerEl  = pageEl.querySelector<HTMLElement>(".pdf-footer");

      const headerBottom_dom = headerEl
        ? headerEl.getBoundingClientRect().bottom - pageRect.top
        : PAD_H + HEADER_H;
      const footerTop_dom = footerEl
        ? footerEl.getBoundingClientRect().top - pageRect.top
        : pageEl.offsetHeight - FOOTER_H - PAD_B;

      // Convert to canvas pixels (scale=2)
      const headerBottom_px = Math.round(headerBottom_dom * SCALE);
      const footerTop_px    = Math.round(footerTop_dom    * SCALE);

      // Render the full section (header + content + footer) to canvas
      const canvas = await html2canvas(pageEl, {
        scale: SCALE,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        width: PAGE_W,
        windowWidth: PAGE_W,
        onclone: (clonedDoc: Document) => {
          clonedDoc.querySelectorAll<HTMLElement>(
            ".shadow-lg,.shadow-md,.shadow-sm,.shadow-xl"
          ).forEach((n) => { n.style.boxShadow = "none"; });
          clonedDoc.querySelectorAll<HTMLElement>(".pdf-page").forEach((n) => {
            n.style.marginBottom = "0";
          });
        },
      } as any);

      const totalH_px   = canvas.height;
      const footerH_px  = totalH_px - footerTop_px;
      const contentH_px = footerTop_px - headerBottom_px;
      const usable_px   = PAGE_H_PX - headerBottom_px - footerH_px;

      if (usable_px <= 0) {
        // Degenerate — just add as-is
        if (i > 0) pdf.addPage("letter", "portrait");
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, PDF_W_MM, PDF_H_MM);
        continue;
      }

      // ── Collect no-break zones (relative to content start = headerBottom_px) ──
      const noBreakEls = Array.from(pageEl.querySelectorAll<HTMLElement>(".pdf-no-break"));
      const noBreakZones = noBreakEls.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          top:    Math.round((r.top    - pageRect.top) * SCALE) - headerBottom_px,
          bottom: Math.round((r.bottom - pageRect.top) * SCALE) - headerBottom_px,
        };
      }).filter((z) => z.top >= 0 && z.top < contentH_px);

      // ── Compute smart break points that avoid cutting no-break zones ──
      const sliceStarts: number[] = [0]; // content-relative starts
      let y = 0;
      while (y + usable_px < contentH_px) {
        let proposed = y + usable_px;
        // Check whether proposed cut falls inside any no-break zone
        const hit = noBreakZones.find((z) => z.top < proposed && z.bottom > proposed);
        if (hit) {
          if (hit.top > y) {
            // Break before the zone starts
            proposed = hit.top;
          } else {
            // Zone is too tall to fit entirely — break after it ends
            proposed = hit.bottom;
          }
        }
        sliceStarts.push(proposed);
        y = proposed;
      }

      // ── Build one composite PDF page per slice ──
      const addCompositePage = (srcContentY: number, sliceH: number) => {
        const comp = document.createElement("canvas");
        comp.width  = PAGE_W_PX;
        comp.height = PAGE_H_PX;
        const ctx = comp.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, PAGE_W_PX, PAGE_H_PX);

        // Header
        ctx.drawImage(canvas, 0, 0, PAGE_W_PX, headerBottom_px, 0, 0, PAGE_W_PX, headerBottom_px);

        // Content slice
        const canvasSrcY = headerBottom_px + srcContentY;
        if (sliceH > 0) {
          ctx.drawImage(canvas, 0, canvasSrcY, PAGE_W_PX, sliceH, 0, headerBottom_px, PAGE_W_PX, sliceH);
        }

        // Footer
        ctx.drawImage(canvas, 0, footerTop_px, PAGE_W_PX, footerH_px, 0, PAGE_H_PX - footerH_px, PAGE_W_PX, footerH_px);

        pdf.addImage(comp.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, PDF_W_MM, PDF_H_MM);
      };

      if (sliceStarts.length === 1) {
        // Whole content fits on one page
        if (i > 0) pdf.addPage("letter", "portrait");
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, PDF_W_MM, PDF_H_MM);
      } else {
        for (let p = 0; p < sliceStarts.length; p++) {
          if (i > 0 || p > 0) pdf.addPage("letter", "portrait");
          const start = sliceStarts[p];
          const end   = p + 1 < sliceStarts.length ? sliceStarts[p + 1] : contentH_px;
          addCompositePage(start, end - start);
        }
      }
    }

    pdf.save(`${quotation.code}.pdf`);
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
    return `${day} de ${monthCap} del ${d.getFullYear()}`;
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const logoSrc = companyLogoFromSettings || s.logoUrl;

  // ── Shared sub-components ────────────────────────────────────────────────
  const PageHeader = ({ pageNum }: { pageNum: number }) => (
    <div className="pdf-header" style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottom: "2px solid #0097A7",
      paddingBottom: "10px",
      marginBottom: "20px",
    }}>
      <img src={logoSrc} alt="SINEM" style={{ height: "50px", objectFit: "contain" }} crossOrigin="anonymous" />
      <div style={{ textAlign: "right", fontSize: "11px", color: "#555", lineHeight: "1.5" }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "12px", color: "#333" }}>{quotation.code}</p>
        <p style={{ margin: "2px 0 0 0" }}>{formatDateShort(quotation.createdAt)}</p>
        <p style={{ margin: "2px 0 0 0", color: "#999" }}>Pág. {pageNum}</p>
      </div>
    </div>
  );

  const PageFooter = () => (
    <div className="pdf-footer" style={FOOTER_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px" }}>
        <div style={{ whiteSpace: "pre-line", flex: 1 }}>{s.footerText}</div>
        <div style={{ fontSize: "10px", color: "#bbb", whiteSpace: "nowrap" }}>
          {s.companyWebsite}
        </div>
      </div>
    </div>
  );

  const SignatureBlock = () => (
    <div style={{ marginBottom: "16px" }}>
      <p style={{ margin: "0 0 8px 0", fontSize: "13px" }}>Atentamente,</p>
      {isApproved ? (
        <div>
          {sigImageUrl && (
            <img
              src={sigImageUrl}
              alt="Firma"
              crossOrigin="anonymous"
              style={{
                display: "block",
                height: "56px",
                maxWidth: "200px",
                objectFit: "contain",
                objectPosition: "left bottom",
                marginBottom: "6px",
                opacity: 0.92,
                mixBlendMode: "multiply",
              }}
            />
          )}
          {!sigImageUrl && <div style={{ height: "32px" }} />}
          <div style={{ borderTop: "1px solid #ccc", paddingTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: "13px", margin: "0 0 2px 0" }}>{sigName}</p>
              <p style={{ fontSize: "12px", margin: "0 0 2px 0", color: "#444" }}>{sigTitle}</p>
              <p style={{ fontSize: "12px", margin: 0, color: "#444" }}>{s.companyName}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "12px", margin: "0 0 2px 0", color: "#444" }}>{sigPhone}</p>
              <p style={{ fontSize: "12px", margin: "0 0 2px 0", color: "#0097A7" }}>{sigEmail}</p>
              <p style={{ fontSize: "12px", margin: 0, color: "#444" }}>{s.companyWebsite}</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "15px 0", color: "#999", fontSize: "12px", fontStyle: "italic" }}>
          Esta cotización está pendiente de aprobación interna. La firma autorizada se mostrará una vez aprobada.
        </div>
      )}
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm print:hidden">
        <div style={{ maxWidth: `${PAGE_W}px` }} className="mx-auto flex items-center justify-between py-3 px-4">
          <span className="text-sm font-semibold text-gray-700">
            {quotation.code} — {quotation.client.company}
          </span>
          <Button onClick={handleDownloadPDF} size="sm">
            <Download className="h-4 w-4 mr-2" /> Descargar PDF
          </Button>
        </div>
      </div>

      {/* All pages */}
      <div
        ref={contentRef}
        style={{ width: `${PAGE_W}px`, margin: "0 auto" }}
        className="my-8 print:my-0"
      >

        {/* ══════════════════════════════════════════════════
            PÁGINA 1 — CARTA DE PRESENTACIÓN
        ══════════════════════════════════════════════════ */}
        <div className="pdf-page bg-white shadow-lg print:shadow-none mb-6" style={PAGE_STYLE}>
          <PageHeader pageNum={1} />

          {/* Info block */}
          <div style={{ textAlign: "right", marginTop: "30px", marginBottom: "30px", fontSize: "13px", lineHeight: "1.8" }}>
            <p style={{ margin: 0 }}>{formatDateLong(quotation.createdAt)}</p>
            <p style={{ margin: 0 }}>Asunto: {quotation.subject}</p>
            <p style={{ margin: 0 }}>De: {sigName}</p>
            <p style={{ margin: 0 }}>Para: {quotation.client.attention}</p>
            <p style={{ margin: 0 }}>No. de oferta: {quotation.code}</p>
          </div>

          <p style={{ margin: "0 0 28px 0", fontSize: "13px" }}>
            {quotation.client.gender === "Sr." ? "Estimado" : "Estimada"} {quotation.client.attention}:
          </p>

          <p style={{ margin: "0 0 22px 0", fontSize: "13px", textAlign: "justify" }}>
            {replacePartner(s.coverIntroText)}
          </p>
          <p style={{ margin: "0 0 22px 0", fontSize: "13px", textAlign: "justify" }}>
            {replacePartner(s.coverPartnerText)}
          </p>
          <p style={{ margin: "0 0 28px 0", fontSize: "13px", textAlign: "justify" }}>
            {s.coverClosingText}
          </p>

          <div className="pdf-no-break">
            <SignatureBlock />
          </div>
          <PageFooter />
        </div>


        {/* ══════════════════════════════════════════════════
            PÁGINA 2 — PROPUESTA TÉCNICO-COMERCIAL
        ══════════════════════════════════════════════════ */}
        <div className="pdf-page bg-white shadow-lg print:shadow-none mb-6" style={PAGE_STYLE}>
          <PageHeader pageNum={2} />

          <p style={{ margin: "0 0 18px 0", fontSize: "13px" }}>{eff?.greetingText}</p>

          {/* Items table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px" }}>
            <thead>
              <tr style={{ backgroundColor: "#0097A7", color: "white" }}>
                <th style={{ padding: "9px 10px", textAlign: "center", fontSize: "11px", fontWeight: 600, width: "36px" }}>No.</th>
                <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "11px", fontWeight: 600 }}>Descripción</th>
                <th style={{ padding: "9px 10px", textAlign: "center", fontSize: "11px", fontWeight: 600, width: "50px" }}>Cant.</th>
                <th style={{ padding: "9px 10px", textAlign: "right", fontSize: "11px", fontWeight: 600, width: "100px" }}>P. Unit. {qCurrency}</th>
                <th style={{ padding: "9px 10px", textAlign: "right", fontSize: "11px", fontWeight: 600, width: "100px" }}>Total {qCurrency}</th>
              </tr>
            </thead>
            <tbody>
              {(quotation?.lineItems ?? []).map((item, i) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e5e5e5", backgroundColor: i % 2 === 0 ? "#fafafa" : "white" }}>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontSize: "12px" }}>{i + 1}</td>
                  <td style={{ padding: "8px 10px", fontSize: "12px" }} dangerouslySetInnerHTML={{ __html: item.description }} />
                  <td style={{ padding: "8px 10px", textAlign: "center", fontSize: "12px" }}>{item.quantity}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontSize: "12px" }}>{fmt(item.unitPriceUSD)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontSize: "12px", fontWeight: 600 }}>{fmt(item.totalUSD)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="pdf-no-break" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <table style={{ borderCollapse: "collapse", minWidth: "260px" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "6px 12px", fontWeight: 600, fontSize: "12px" }}>Subtotal:</td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontSize: "12px" }}>{fmt(clientSubtotal)}</td>
                </tr>
                {quotation.applyItbis && (
                  <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "6px 12px", fontWeight: 600, fontSize: "12px" }}>ITBIS ({quotation.itbisPercent}%):</td>
                    <td style={{ padding: "6px 12px", textAlign: "right", fontSize: "12px" }}>{fmt(clientItbis)}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: "#0097A7" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: "13px", color: "white" }}>Total General:</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, fontSize: "13px", color: "white" }}>{fmt(clientTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {qCurrency !== "USD" && !qIsOriginal && (
            <p style={{ fontSize: "10px", color: "#888", margin: "-8px 0 14px 0", textAlign: "right" }}>
              Tasa de cambio aplicada: 1 USD = {qRate} {qCurrency}
            </p>
          )}

          {quotation.notes && (
            <div style={{ marginBottom: "18px", padding: "10px 14px", backgroundColor: "#f8f9fa", borderLeft: "3px solid #0097A7", borderRadius: "4px" }}>
              <p style={{ fontWeight: 600, fontSize: "11px", color: "#555", margin: "0 0 3px 0" }}>Notas:</p>
              <p style={{ margin: 0, fontSize: "12px" }}>{quotation.notes}</p>
            </div>
          )}

          {/* Condiciones Comerciales */}
          <div className="pdf-no-break" style={{ marginBottom: "18px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "8px", borderBottom: "2px solid #0097A7", paddingBottom: "4px" }}>
              Condiciones Comerciales
            </h3>
            <table style={{ fontSize: "12px", borderCollapse: "collapse", width: "100%" }}>
              <tbody>
                {[
                  ["Moneda:", "Dólares Americanos (USD)"],
                  ["Forma de Pago:", quotation.paymentTerms],
                  ["Condiciones de Entrega:", quotation.deliveryTerms ?? "—"],
                  ["Tiempo de Entrega:", [quotation.deliveryWeeksMin || quotation.deliveryWeeksMax ? `${quotation.deliveryWeeksMin}-${quotation.deliveryWeeksMax} semanas` : null, quotation.deliveryTimeNote].filter(Boolean).join(" — ") || "—"],
                  ["Validez de la Oferta:", `${quotation.validityDays} días`],
                  ["Lugar de Entrega:", quotation.deliveryLocation],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ fontWeight: 600, padding: "5px 0", width: "175px", color: "#555" }}>{label}</td>
                    <td style={{ padding: "5px 0" }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {quotation.specialConsiderations && (
              <div style={{ marginTop: "10px" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "4px" }}>Consideraciones Especiales:</p>
                <p style={{ fontSize: "12px", whiteSpace: "pre-wrap", color: "#333" }}>{quotation.specialConsiderations}</p>
              </div>
            )}
          </div>

          <PageFooter />
        </div>


        {/* ══════════════════════════════════════════════════
            PÁGINA 3 — TÉRMINOS, CONDICIONES Y FIRMA
        ══════════════════════════════════════════════════ */}
        <div className="pdf-page bg-white shadow-lg print:shadow-none mb-6" style={PAGE_STYLE}>
          <PageHeader pageNum={3} />

          {[
            { title: "Garantía", text: eff?.warrantyText },
            { title: "Responsabilidad", text: eff?.responsibilityText },
            { title: "Riesgos", text: eff?.risksText },
            { title: "Instalación", text: eff?.installationText },
          ].map(({ title, text }) => text ? (
            <div key={title} className="pdf-no-break" style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "6px" }}>{title}</h3>
              <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{text}</div>
            </div>
          ) : null)}

          <div className="pdf-no-break" style={{ marginBottom: "14px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "6px" }}>Vigencia de la propuesta</h3>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>
              La presente oferta tiene una vigencia de <strong>{quotation.validityDays} días</strong> a partir de la fecha de emisión.
              {eff?.validityText ? ` ${eff.validityText}` : ""}
            </div>
          </div>

          {eff?.returnsText ? (
            <div className="pdf-no-break" style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "6px" }}>Devoluciones y/o cancelaciones</h3>
              <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{eff.returnsText}</div>
            </div>
          ) : null}

          {eff?.legalClauses ? (
            <div className="pdf-no-break" style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "6px", borderBottom: "2px solid #0097A7", paddingBottom: "4px" }}>
                Términos y Condiciones
              </h3>
              <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{eff.legalClauses}</div>
            </div>
          ) : null}

          {/* Datos para Orden de Compra */}
          <div className="pdf-no-break" style={{ marginBottom: "18px" }}>
            <p style={{ fontSize: "12px", margin: "0 0 8px 0", lineHeight: "1.7" }}>
              En caso de ser favorecidos con su pedido, les agradeceremos emitir la orden de compra a nombre de:
            </p>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.8", fontWeight: 500 }}>{s.purchaseOrderInfo}</div>
            <div style={{ marginTop: "12px", fontSize: "12px", lineHeight: "1.7" }}>
              <p style={{ margin: "0 0 2px 0" }}>Con atención a {sigName}</p>
              <p style={{ margin: "0 0 2px 0" }}>Teléfono: {sigPhone}</p>
              <p style={{ margin: 0 }}>{sigEmail}</p>
            </div>
          </div>

          {eff?.closingText ? (
            <p className="pdf-no-break" style={{ fontSize: "12px", margin: "0 0 24px 0", lineHeight: "1.7" }}>{eff.closingText}</p>
          ) : null}

          <div className="pdf-no-break">
            <SignatureBlock />
          </div>
          <PageFooter />
        </div>

      </div>
    </div>
  );
};

export default OfertaPublica;
