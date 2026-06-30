import React from "react";
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

// ── Bilingual labels ────────────────────────────────────────────────────────
const LABELS = {
  es: {
    page: "Pág.",
    downloadPDF: "Descargar PDF",
    sincerely: "Atentamente,",
    pendingSignature: "Esta cotización está pendiente de aprobación interna. La firma autorizada se mostrará una vez aprobada.",
    subject: "Asunto:",
    from: "De:",
    to: "Para:",
    offerNo: "No. de oferta:",
    dear: (gender: string) => gender === "Sr." ? "Estimado" : "Estimada",
    tableDescription: "Descripción",
    tableQty: "Cant.",
    tableUnitPrice: "P. Unit.",
    tableTotal: "Total",
    subtotal: "Subtotal:",
    itbis: (pct: number) => `ITBIS (${pct}%):`,
    groupTotal: "Total:",
    grandTotal: "Total General:",
    exchangeRate: (rate: number, currency: string) => `Tasa de cambio aplicada: 1 USD = ${rate} ${currency}`,
    notes: "Notas:",
    commercialTerms: "Condiciones Comerciales",
    currencyLabel: "Moneda:",
    currencyName: { USD: "Dólares Americanos (USD)", DOP: "Pesos Dominicanos (DOP)", EUR: "Euros (EUR)" } as Record<string, string>,
    paymentTerms: "Forma de Pago:",
    deliveryTerms: "Condiciones de Entrega:",
    deliveryTime: "Tiempo de Entrega:",
    weeks: "semanas",
    offerValidity: "Validez de la Oferta:",
    days: "días",
    deliveryLocation: "Lugar de Entrega:",
    specialConsiderations: "Consideraciones Especiales:",
    warranty: "Garantía",
    responsibility: "Responsabilidad",
    risks: "Riesgos",
    installation: "Instalación",
    proposalValidity: "Vigencia de la propuesta",
    validityText: (days: number) => `La presente oferta tiene una vigencia de ${days} días a partir de la fecha de emisión.`,
    returnsAndCancellations: "Devoluciones y/o cancelaciones",
    termsAndConditions: "Términos y Condiciones",
    purchaseOrderIntro: "En caso de ser favorecidos con su pedido, les agradeceremos emitir la orden de compra a nombre de:",
    attention: (name: string) => `Con atención a ${name}`,
    phone: "Teléfono:",
  },
  en: {
    page: "Page",
    downloadPDF: "Download PDF",
    sincerely: "Sincerely,",
    pendingSignature: "This quotation is pending internal approval. The authorized signature will be displayed once approved.",
    subject: "Subject:",
    from: "From:",
    to: "To:",
    offerNo: "Offer No.:",
    dear: (_gender: string) => "Dear",
    tableDescription: "Description",
    tableQty: "Qty.",
    tableUnitPrice: "Unit P.",
    tableTotal: "Total",
    subtotal: "Subtotal:",
    itbis: (pct: number) => `Tax (${pct}%):`,
    groupTotal: "Total:",
    grandTotal: "Grand Total:",
    exchangeRate: (rate: number, currency: string) => `Exchange rate applied: 1 USD = ${rate} ${currency}`,
    notes: "Notes:",
    commercialTerms: "Commercial Terms",
    currencyLabel: "Currency:",
    currencyName: { USD: "US Dollars (USD)", DOP: "Dominican Pesos (DOP)", EUR: "Euros (EUR)" } as Record<string, string>,
    paymentTerms: "Payment Terms:",
    deliveryTerms: "Delivery Terms:",
    deliveryTime: "Delivery Time:",
    weeks: "weeks",
    offerValidity: "Offer Validity:",
    days: "days",
    deliveryLocation: "Delivery Location:",
    specialConsiderations: "Special Considerations:",
    warranty: "Warranty",
    responsibility: "Responsibility",
    risks: "Risks",
    installation: "Installation",
    proposalValidity: "Proposal Validity",
    validityText: (days: number) => `This offer is valid for ${days} days from the date of issue.`,
    returnsAndCancellations: "Returns and/or Cancellations",
    termsAndConditions: "Terms and Conditions",
    purchaseOrderIntro: "Should you favor us with your order, we would appreciate issuing the purchase order in the name of:",
    attention: (name: string) => `Attention: ${name}`,
    phone: "Phone:",
  },
} as const;

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
  footerText: row.footer_text ?? "",
  greetingTextEn: row.greeting_text_en ?? "",
  warrantyTextEn: row.warranty_text_en ?? "",
  responsibilityTextEn: row.responsibility_text_en ?? "",
  risksTextEn: row.risks_text_en ?? "",
  installationTextEn: row.installation_text_en ?? "",
  validityTextEn: row.validity_text_en ?? "",
  returnsTextEn: row.returns_text_en ?? "",
  legalClausesEn: row.legal_clauses_en ?? "",
  purchaseOrderInfoEn: row.purchase_order_info_en ?? "",
  closingTextEn: row.closing_text_en ?? "",
  coverIntroTextEn: row.cover_intro_text_en ?? "",
  coverPartnerTextEn: row.cover_partner_text_en ?? "",
  coverClosingTextEn: row.cover_closing_text_en ?? "",
  footerTextEn: row.footer_text_en ?? "",
  signatureName: row.signature_name ?? "",
  signatureTitle: row.signature_title ?? "",
  signaturePhone: row.signature_phone ?? "",
  signatureEmail: row.signature_email ?? "",
  signatureImageUrl: row.signature_image_url ?? "",
});

// ─────────────────────────────────────────────────────────────────────────────
// PDF pagination helpers (line-aware slicing)
//
// The download renders each .pdf-page section to canvas via html2canvas. When a
// section is taller than one physical page it must be split. The break points
// are snapped to the GAPS between real text line boxes (measured with the Range
// API on the live DOM) so a cut never bisects a line — which is exactly how the
// browser preview paginates. Page numbers are then stamped sequentially across
// all physical pages.
// ─────────────────────────────────────────────────────────────────────────────

// Wait for fonts + images to settle so measured line boxes match what renders.
async function ensureAssetsReady(root: HTMLElement) {
  try { await (document as any).fonts?.ready; } catch { /* no-op */ }
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return (img.decode?.() ?? Promise.reject()).catch(
        () =>
          new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          })
      );
    })
  );
}

// The children of a .pdf-page that sit between the header and footer, plus the
// absolute top of the content and its real height (max child bottom, NOT the
// footer top which marginTop:auto pushes down).
function measureGeometry(pageEl: HTMLElement) {
  const headerEl = pageEl.querySelector<HTMLElement>(".pdf-header");
  const footerEl = pageEl.querySelector<HTMLElement>(".pdf-footer");
  const all = Array.from(pageEl.children) as HTMLElement[];
  const hIdx = headerEl ? all.indexOf(headerEl) : -1;
  const fIdx = footerEl ? all.indexOf(footerEl) : all.length;
  const contentChildren = all.slice(hIdx + 1, fIdx);

  const contentTop_abs = contentChildren.length
    ? contentChildren[0].getBoundingClientRect().top
    : pageEl.getBoundingClientRect().top;
  let contentBottom_abs = contentTop_abs;
  for (const ch of contentChildren) {
    contentBottom_abs = Math.max(contentBottom_abs, ch.getBoundingClientRect().bottom);
  }
  const contentH = contentBottom_abs - contentTop_abs;
  return { headerEl, footerEl, contentChildren, contentTop_abs, contentH };
}

interface BreakInterval { top: number; bottom: number; }

// Enumerate Y positions (relative to content top) where a break is SAFE — i.e.
// not inside any text line box, image, or small no-break element. The giant
// description cell (taller than the usable window) is intentionally splittable
// so it breaks between its own line boxes.
function collectBreakModel(contentChildren: HTMLElement[], originAbsY: number, winH: number) {
  const candidates = new Set<number>([0]);
  const forbidden: BreakInterval[] = [];
  const add = (top: number, bottom: number, forbid: boolean) => {
    candidates.add(top);
    candidates.add(bottom);
    if (forbid && bottom - top > 0.5) forbidden.push({ top, bottom });
  };
  const range = document.createRange();

  for (const child of contentChildren) {
    // One rect per line box from each text node → forbidden intervals.
    const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.nodeValue && n.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });
    let tn: Node | null;
    while ((tn = walker.nextNode())) {
      range.selectNodeContents(tn);
      const rects = range.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.width === 0 || r.height === 0) continue;
        add(r.top - originAbsY, r.bottom - originAbsY, true);
      }
    }
    // Block / row / image boundaries are candidate cut points.
    child.querySelectorAll<HTMLElement>("tr,p,div,table,img,h1,h2,h3,h4,li,hr").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height === 0) return;
      const top = r.top - originAbsY;
      const bottom = r.bottom - originAbsY;
      const isImg = el.tagName === "IMG";
      const noBreak = el.classList.contains("pdf-no-break");
      add(top, bottom, isImg || (noBreak && bottom - top <= winH));
    });
  }

  const EPS = 0.75;
  const isSafe = (y: number) => !forbidden.some((f) => f.top + EPS < y && y < f.bottom - EPS);
  const safeBreaks = [...candidates]
    .filter((y) => y > EPS)
    .filter(isSafe)
    .sort((a, b) => a - b);
  return { safeBreaks };
}

// Greedy: each page takes as much as fits up to the largest safe break ≤ y+winH.
function computeSlices(safeBreaks: number[], contentH: number, winH: number): number[] {
  const EPS = 0.75;
  const starts = [0];
  let y = 0;
  while (y + winH < contentH - EPS) {
    const limit = y + winH;
    let pick = -1;
    for (const b of safeBreaks) {
      if (b > y + 1 && b <= limit + EPS) pick = b;
      else if (b > limit + EPS) break;
    }
    if (pick < 0) pick = limit; // pathological: a single line taller than a page
    starts.push(pick);
    y = pick;
  }
  if (starts.length > 1 && contentH - starts[starts.length - 1] < 2) starts.pop();
  return starts;
}

// Off-screen 816×1056 skeleton that mirrors the .pdf-page layout exactly so the
// clip window (win) and text wrapping match the live page. The header and footer
// are cloned in BEFORE measuring so winH is the real space left for content —
// never an arithmetic guess. Read winH straight off the element.
function buildContainer(headerEl: HTMLElement | null, footerEl: HTMLElement | null) {
  const container = document.createElement("div");
  Object.assign(container.style, {
    fontFamily: "'Inter', Arial, sans-serif",
    color: "#1a1a1a",
    fontSize: "13px",
    lineHeight: "1.7",
    width: `${PAGE_W}px`,
    height: `${PAGE_H}px`,
    padding: `${PAD_H}px ${PAD_V}px ${PAD_B}px ${PAD_V}px`,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    overflow: "hidden",
    background: "white",
    position: "fixed",
    left: `-${PAGE_W + 200}px`,
    top: "0",
    pointerEvents: "none",
  });
  const headerHost = document.createElement("div");
  if (headerEl) headerHost.appendChild(headerEl.cloneNode(true));
  const win = document.createElement("div");
  Object.assign(win.style, { flex: "1", minHeight: "0", overflow: "hidden", position: "relative" });
  const footerHost = document.createElement("div");
  if (footerEl) {
    const fc = footerEl.cloneNode(true) as HTMLElement;
    fc.style.marginTop = "0";
    footerHost.appendChild(fc);
  }
  container.append(headerHost, win, footerHost);
  document.body.appendChild(container);
  const winH = Math.floor(win.getBoundingClientRect().height);
  return { container, headerHost, win, winH };
}

// Render exactly the band [srcY, endY): the content is shifted up by srcY and
// clipped to (endY - srcY) so the slice ends at the chosen safe break — NOT at
// the full window height. Without this clip the line straddling the window
// bottom would be cut here AND repeated whole on the next page (the original bug).
// Shared Math.round on both bounds keeps the seam pixel-aligned across pages.
function renderSlice(win: HTMLElement, contentChildren: HTMLElement[], srcY: number, endY: number) {
  win.innerHTML = "";
  const top = Math.round(srcY);
  const clip = document.createElement("div");
  clip.style.position = "relative";
  clip.style.overflow = "hidden";
  clip.style.height = `${Math.max(0, Math.round(endY) - top)}px`;
  const holder = document.createElement("div");
  holder.style.position = "relative";
  holder.style.top = `-${top}px`;
  contentChildren.forEach((ch) => holder.appendChild(ch.cloneNode(true)));
  clip.appendChild(holder);
  win.appendChild(clip);
}

// Locate the "Pág. N" node inside a cloned header (class first, then label, then last <p>).
function locatePageNumberNode(headerClone: HTMLElement, pageLabel: string): HTMLElement | null {
  const byClass = headerClone.querySelector<HTMLElement>(".pdf-pagenum");
  if (byClass) return byClass;
  const ps = Array.from(headerClone.querySelectorAll("p"));
  const byLabel = ps.find((p) => (p.textContent ?? "").trim().startsWith(pageLabel));
  return (byLabel as HTMLElement) ?? (ps[ps.length - 1] ?? null);
}

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
          subtotalGroup: li.subtotal_group ?? undefined,
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
          showPartnerText: (qRow as any).show_partner_text ?? true,
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
          showItemSubtotals: (qRow as any).show_item_subtotals ?? false,
          language: ((qRow as any).language ?? 'es') as 'es' | 'en',
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

  const lang = (quotation?.language ?? 'es') as 'es' | 'en';

  // Merge per-quotation text overrides with global proposal settings (EN or ES based on language)
  const pt = quotation?.proposalTexts;
  // Helper: for a given text, use per-quotation override first, then EN default if language=en, then ES default
  const txt = (override: string | undefined, enDefault: string, esDefault: string) =>
    override || (lang === 'en' ? enDefault || esDefault : esDefault);

  const eff: ProposalSettings | null = s ? {
    ...s,
    greetingText: txt(pt?.greetingText, s.greetingTextEn, s.greetingText),
    warrantyText: txt(pt?.warrantyText, s.warrantyTextEn, s.warrantyText),
    responsibilityText: txt(pt?.responsibilityText, s.responsibilityTextEn, s.responsibilityText),
    risksText: txt(pt?.risksText, s.risksTextEn, s.risksText),
    installationText: txt(pt?.installationText, s.installationTextEn, s.installationText),
    validityText: txt(pt?.validityText, s.validityTextEn, s.validityText),
    returnsText: txt(pt?.returnsText, s.returnsTextEn, s.returnsText),
    legalClauses: txt(pt?.legalClauses, s.legalClausesEn, s.legalClauses),
    closingText: txt(pt?.closingText, s.closingTextEn, s.closingText),
    // Cover page texts (no per-quotation override)
    coverIntroText: lang === 'en' ? (s.coverIntroTextEn || s.coverIntroText) : s.coverIntroText,
    coverPartnerText: lang === 'en' ? (s.coverPartnerTextEn || s.coverPartnerText) : s.coverPartnerText,
    coverClosingText: lang === 'en' ? (s.coverClosingTextEn || s.coverClosingText) : s.coverClosingText,
    purchaseOrderInfo: lang === 'en' ? (s.purchaseOrderInfoEn || s.purchaseOrderInfo) : s.purchaseOrderInfo,
    footerText: lang === 'en' ? (s.footerTextEn || s.footerText) : s.footerText,
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
  const L = LABELS[lang];

  const [searchParams] = useSearchParams();
  const autoDownload = searchParams.get("download") === "true";
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  // Letter: 215.9 × 279.4 mm — matches PAGE_W × PAGE_H at 96 dpi
  const PDF_W_MM = 215.9;
  const PDF_H_MM = 279.4;
  const SCALE = 2;

  const handleDownloadPDF = async () => {
    if (!contentRef.current || !quotation) return;

    const pageEls = Array.from(
      contentRef.current.querySelectorAll<HTMLElement>(".pdf-page")
    );
    if (pageEls.length === 0) return;

    // Measure only after fonts + images are settled, otherwise line boxes shift.
    await ensureAssetsReady(contentRef.current);

    const pdf = new jsPDF({
      unit: "mm",
      format: "letter",
      orientation: "portrait",
      compress: true,
    });

    const h2cBase = {
      scale: SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: PAGE_W,
      onclone: (doc: Document) => {
        doc.querySelectorAll<HTMLElement>(
          ".shadow-lg,.shadow-md,.shadow-sm,.shadow-xl"
        ).forEach((n) => { n.style.boxShadow = "none"; });
        doc.querySelectorAll<HTMLElement>(".pdf-page").forEach((n) => {
          n.style.marginBottom = "0";
        });
      },
    };

    // ── PASS 1: plan every physical page ──────────────────────────────────────
    // A non-overflowing section is one physical page; an overflowing one is split
    // into line-aligned slices. The plan is flat so page numbers can be stamped
    // sequentially across all sections in pass 2.
    type PlanItem = { pageEl: HTMLElement; srcY: number; endY: number; single: boolean };
    const plan: PlanItem[] = [];

    for (let pi = 0; pi < pageEls.length; pi++) {
      const pageEl = pageEls[pi];
      pageEl.dataset.pdfIndex = String(pi);
      const { headerEl, footerEl, contentChildren, contentTop_abs, contentH } = measureGeometry(pageEl);

      // winH = the real clip-window height (header + footer + padding baked in).
      const probe = buildContainer(headerEl, footerEl);
      const winH = probe.winH;
      document.body.removeChild(probe.container);

      if (winH <= 0 || contentH <= winH || contentChildren.length === 0) {
        plan.push({ pageEl, srcY: 0, endY: contentH, single: true });
        continue;
      }

      const { safeBreaks } = collectBreakModel(contentChildren, contentTop_abs, winH);
      const starts = computeSlices(safeBreaks, contentH, winH);
      starts.forEach((srcY, i) => {
        const endY = i + 1 < starts.length ? starts[i + 1] : contentH;
        plan.push({ pageEl, srcY, endY, single: false });
      });
    }

    const totalPages = plan.length;

    // ── PASS 2: render with a single monotonic physical page number ───────────
    for (let n = 0; n < totalPages; n++) {
      const { pageEl, srcY, endY, single } = plan[n];
      if (n > 0) pdf.addPage("letter", "portrait");
      const pageNum = n + 1;

      if (single) {
        // Render the live element directly to preserve its exact flex layout.
        const canvas = await html2canvas(pageEl, {
          ...h2cBase,
          width: PAGE_W,
          onclone: (doc: Document) => {
            h2cBase.onclone(doc);
            const cl = doc.querySelector<HTMLElement>(
              `.pdf-page[data-pdf-index="${pageEl.dataset.pdfIndex}"]`
            );
            const hdr = cl?.querySelector<HTMLElement>(".pdf-header");
            const node = hdr ? locatePageNumberNode(hdr, L.page) : null;
            if (node) node.textContent = `${L.page} ${pageNum}`;
          },
        } as any);
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, PDF_W_MM, PDF_H_MM);
        continue;
      }

      const { headerEl, footerEl, contentChildren } = measureGeometry(pageEl);
      const { container, headerHost, win } = buildContainer(headerEl, footerEl);
      try {
        // Header was cloned inside buildContainer — stamp the running page number on it.
        const node = locatePageNumberNode(headerHost, L.page);
        if (node) node.textContent = `${L.page} ${pageNum}`;
        renderSlice(win, contentChildren, srcY, endY);
        await ensureAssetsReady(container);

        const canvas = await html2canvas(container, {
          ...h2cBase,
          width: PAGE_W,
          height: PAGE_H,
        } as any);
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, PDF_W_MM, PDF_H_MM);
      } finally {
        if (container.parentNode) document.body.removeChild(container);
      }
    }

    pdf.save(`${quotation.code}.pdf`);
  };

  useEffect(() => {
    if (autoDownload && !downloadTriggered && contentRef.current && quotation) {
      const timer = setTimeout(() => {
        handleDownloadPDF().catch((err) => console.error("PDF download failed:", err));
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
    if (lang === 'en') {
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }
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
        <p className="pdf-pagenum" style={{ margin: "2px 0 0 0", color: "#999" }}>{L.page} {pageNum}</p>
      </div>
    </div>
  );

  const PageFooter = () => (
    <div className="pdf-footer" style={FOOTER_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px" }}>
        <div style={{ whiteSpace: "pre-line", flex: 1 }}>{eff?.footerText ?? s.footerText}</div>
        <div style={{ fontSize: "10px", color: "#bbb", whiteSpace: "nowrap" }}>
          {s.companyWebsite}
        </div>
      </div>
    </div>
  );

  const SignatureBlock = () => (
    <div style={{ marginBottom: "16px" }}>
      <p style={{ margin: "0 0 8px 0", fontSize: "13px" }}>{L.sincerely}</p>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
          {L.pendingSignature}
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
            <Download className="h-4 w-4 mr-2" /> {L.downloadPDF}
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
            <p style={{ margin: 0 }}>{L.subject} {quotation.subject}</p>
            <p style={{ margin: 0 }}>{L.from} {sigName}</p>
            <p style={{ margin: 0 }}>{L.to} {quotation.client.attention}</p>
            <p style={{ margin: 0 }}>{L.offerNo} {quotation.code}</p>
          </div>

          <p style={{ margin: "0 0 28px 0", fontSize: "13px" }}>
            {L.dear(quotation.client.gender ?? "Sra.")} {quotation.client.attention}:
          </p>

          <p style={{ margin: "0 0 22px 0", fontSize: "13px", textAlign: "justify" }}>
            {replacePartner(eff?.coverIntroText ?? s.coverIntroText)}
          </p>
          {(quotation.showPartnerText ?? true) && (
            <p style={{ margin: "0 0 22px 0", fontSize: "13px", textAlign: "justify" }}>
              {replacePartner(eff?.coverPartnerText ?? s.coverPartnerText)}
            </p>
          )}
          <p style={{ margin: "0 0 28px 0", fontSize: "13px", textAlign: "justify" }}>
            {eff?.coverClosingText ?? s.coverClosingText}
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
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "24px" }} />
              <col />
              <col style={{ width: "32px" }} />
              <col style={{ width: "88px" }} />
              <col style={{ width: "88px" }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: "#0097A7", color: "white" }}>
                <th style={{ padding: "9px 8px", textAlign: "center", fontSize: "11px", fontWeight: 600 }}>No.</th>
                <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "11px", fontWeight: 600 }}>{L.tableDescription}</th>
                <th style={{ padding: "9px 6px", textAlign: "center", fontSize: "11px", fontWeight: 600 }}>{L.tableQty}</th>
                <th style={{ padding: "9px 8px", textAlign: "right", fontSize: "11px", fontWeight: 600 }}>{L.tableUnitPrice} {qCurrency}</th>
                <th style={{ padding: "9px 8px", textAlign: "right", fontSize: "11px", fontWeight: 600 }}>{L.tableTotal} {qCurrency}</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const items = quotation?.lineItems ?? [];
                if (!quotation?.showItemSubtotals) {
                  return items.map((item, i) => (
                    <tr key={`r-${item.id}`} className="pdf-no-break" style={{ borderBottom: "1px solid #e5e5e5", backgroundColor: i % 2 === 0 ? "#fafafa" : "white" }}>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontSize: "12px" }}>{i + 1}</td>
                      <td style={{ padding: "6px 8px", fontSize: "12px", lineHeight: "1.5", wordWrap: "break-word", overflowWrap: "break-word" }} dangerouslySetInnerHTML={{ __html: item.description }} />
                      <td style={{ padding: "6px 6px", textAlign: "center", fontSize: "12px" }}>{item.quantity}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontSize: "12px" }}>{fmt(item.unitPriceUSD)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontSize: "12px", fontWeight: 600 }}>{fmt(item.totalUSD)}</td>
                    </tr>
                  ));
                }

                // Group ALL items with the same subtotalGroup label together (first-appearance order of labels)
                type Run = { grp: string; items: typeof items; startGlobalIdx: number };
                type Solo = { grp: undefined; item: typeof items[0]; globalIdx: number };
                const seenGrp = new Set<string>();
                const orderedRuns: (Run | Solo)[] = [];
                items.forEach((item) => {
                  const g = (item as any).subtotalGroup as string | undefined;
                  if (!g) return; // handled below
                  if (!seenGrp.has(g)) {
                    seenGrp.add(g);
                    orderedRuns.push({ grp: g, items: items.filter((i) => (i as any).subtotalGroup === g), startGlobalIdx: 0 });
                  }
                });
                // Add ungrouped items (no subtotalGroup) in their original order, at the end
                items.forEach((item) => {
                  const g = (item as any).subtotalGroup as string | undefined;
                  if (!g) orderedRuns.push({ grp: undefined, item, globalIdx: 0 });
                });
                // Assign sequential global indices for display numbering
                let gi = 0;
                const runs: (Run | Solo)[] = orderedRuns.map((r) => {
                  if (r.grp === undefined) {
                    const solo = { ...r, globalIdx: gi } as Solo;
                    gi++;
                    return solo;
                  } else {
                    const run = { ...r, startGlobalIdx: gi } as Run;
                    gi += r.items.length;
                    return run;
                  }
                });

                const allRows: React.ReactElement[] = [];
                runs.forEach((run, runIdx) => {
                  if (run.grp === undefined) {
                    const solo = run as Solo;
                    allRows.push(
                      <tr key={`r-${solo.item.id}`} className="pdf-no-break" style={{ borderBottom: "1px solid #e5e5e5", backgroundColor: solo.globalIdx % 2 === 0 ? "#fafafa" : "white" }}>
                        <td style={{ padding: "6px 8px", textAlign: "center", fontSize: "12px" }}>{solo.globalIdx + 1}</td>
                        <td style={{ padding: "6px 8px", fontSize: "12px", lineHeight: "1.5", wordWrap: "break-word", overflowWrap: "break-word" }} dangerouslySetInnerHTML={{ __html: solo.item.description }} />
                        <td style={{ padding: "6px 6px", textAlign: "center", fontSize: "12px" }}>{solo.item.quantity}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontSize: "12px" }}>{fmt(solo.item.unitPriceUSD)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontSize: "12px", fontWeight: 600 }}>{fmt(solo.item.totalUSD)}</td>
                      </tr>
                    );
                  } else {
                    const r = run as Run;
                    r.items.forEach((item, j) => {
                      const rowIdx = r.startGlobalIdx + j;
                      allRows.push(
                        <tr key={`r-${item.id}`} className="pdf-no-break" style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: rowIdx % 2 === 0 ? "#fafafa" : "white" }}>
                          <td style={{ padding: "6px 8px", textAlign: "center", fontSize: "12px" }}>{rowIdx + 1}</td>
                          <td style={{ padding: "6px 8px", fontSize: "12px", lineHeight: "1.5", wordWrap: "break-word", overflowWrap: "break-word" }} dangerouslySetInnerHTML={{ __html: item.description }} />
                          <td style={{ padding: "6px 6px", textAlign: "center", fontSize: "12px" }}>{item.quantity}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontSize: "12px" }}>{fmt(item.unitPriceUSD)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontSize: "12px", fontWeight: 600 }}>{fmt(item.totalUSD)}</td>
                        </tr>
                      );
                    });
                    if (r.items.length >= 1) {
                      const groupSubtotal = r.items.reduce((s, it) => s + it.totalUSD, 0);
                      const groupItbis = quotation.applyItbis
                        ? Math.round(groupSubtotal * (quotation.itbisPercent / 100) * 100) / 100
                        : 0;
                      const groupTotal = groupSubtotal + groupItbis;
                      allRows.push(
                        <tr key={`sub-${r.grp}-${runIdx}`} style={{ backgroundColor: "#f0f7fa" }}>
                          <td colSpan={3} />
                          <td style={{ padding: "4px 10px", fontSize: "11px", color: "#555", textAlign: "right" }}>{L.subtotal}</td>
                          <td style={{ padding: "4px 10px", fontSize: "11px", textAlign: "right", fontWeight: 600 }}>{fmt(groupSubtotal)}</td>
                        </tr>
                      );
                      if (quotation.applyItbis) {
                        allRows.push(
                          <tr key={`itb-${r.grp}-${runIdx}`} style={{ backgroundColor: "#f0f7fa" }}>
                            <td colSpan={3} />
                            <td style={{ padding: "3px 10px", fontSize: "11px", color: "#555", textAlign: "right" }}>{L.itbis(quotation.itbisPercent)}</td>
                            <td style={{ padding: "3px 10px", fontSize: "11px", textAlign: "right" }}>{fmt(groupItbis)}</td>
                          </tr>
                        );
                      }
                      allRows.push(
                        <tr key={`tot-${r.grp}-${runIdx}`} style={{ backgroundColor: "#dcedf3", borderBottom: "2px solid #aaccd8" }}>
                          <td colSpan={3} />
                          <td style={{ padding: "5px 10px", fontSize: "11px", fontWeight: 700, color: "#005f70", textAlign: "right" }}>{L.groupTotal}</td>
                          <td style={{ padding: "5px 10px", fontSize: "11px", fontWeight: 700, color: "#005f70", textAlign: "right" }}>{fmt(groupTotal)}</td>
                        </tr>
                      );
                      if (runIdx < runs.length - 1) {
                        allRows.push(<tr key={`gap-${runIdx}`}><td colSpan={5} style={{ padding: "4px 0" }} /></tr>);
                      }
                    }
                  }
                });
                return allRows;
              })()}
            </tbody>
          </table>

          {/* Totals */}
          <div className="pdf-no-break" style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <table style={{ borderCollapse: "collapse", minWidth: "260px" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "6px 12px", fontWeight: 600, fontSize: "12px" }}>{L.subtotal}</td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontSize: "12px" }}>{fmt(clientSubtotal)}</td>
                </tr>
                {quotation.applyItbis && (
                  <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td style={{ padding: "6px 12px", fontWeight: 600, fontSize: "12px" }}>{L.itbis(quotation.itbisPercent)}</td>
                    <td style={{ padding: "6px 12px", textAlign: "right", fontSize: "12px" }}>{fmt(clientItbis)}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: "#0097A7" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: "13px", color: "white" }}>{L.grandTotal}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, fontSize: "13px", color: "white" }}>{fmt(clientTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {qCurrency !== "USD" && !qIsOriginal && (
            <p style={{ fontSize: "10px", color: "#888", margin: "-8px 0 14px 0", textAlign: "right" }}>
              {L.exchangeRate(qRate, qCurrency)}
            </p>
          )}

          {quotation.notes && (
            <div className="pdf-no-break" style={{ marginBottom: "18px", padding: "10px 14px", backgroundColor: "#f8f9fa", borderLeft: "3px solid #0097A7", borderRadius: "4px" }}>
              <p style={{ fontWeight: 600, fontSize: "11px", color: "#555", margin: "0 0 3px 0" }}>{L.notes}</p>
              <p style={{ margin: 0, fontSize: "12px", whiteSpace: "pre-wrap" }}>{quotation.notes}</p>
            </div>
          )}

          {/* Condiciones Comerciales */}
          <div style={{ marginBottom: "18px" }}>
            <div className="pdf-no-break">
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "8px", borderBottom: "2px solid #0097A7", paddingBottom: "4px" }}>
                {L.commercialTerms}
              </h3>
              <table style={{ fontSize: "12px", borderCollapse: "collapse", width: "100%" }}>
                <tbody>
                  {[
                    [L.currencyLabel, L.currencyName[qCurrency] ?? qCurrency],
                    [L.paymentTerms, quotation.paymentTerms],
                    [L.deliveryTerms, quotation.deliveryTerms ?? "—"],
                    [L.deliveryTime, (() => { const mn = quotation.deliveryWeeksMin; const mx = quotation.deliveryWeeksMax; const hasMin = mn != null && mn !== 0; const hasMax = mx != null && mx !== 0; const wStr = hasMin && hasMax ? `${mn}-${mx} ${L.weeks}` : hasMax ? `${mx} ${L.weeks}` : hasMin ? `${mn} ${L.weeks}` : null; return [wStr, quotation.deliveryTimeNote].filter(Boolean).join(" — ") || "—"; })()],
                    [L.offerValidity, `${quotation.validityDays} ${L.days}`],
                    [L.deliveryLocation, quotation.deliveryLocation],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ fontWeight: 600, padding: "5px 0", width: "175px", color: "#555" }}>{label}</td>
                      <td style={{ padding: "5px 0" }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {quotation.specialConsiderations && (
              <div className="pdf-no-break" style={{ marginTop: "10px" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#555", marginBottom: "4px" }}>{L.specialConsiderations}</p>
                <p style={{ fontSize: "12px", whiteSpace: "pre-wrap", color: "#333", lineHeight: "1.6" }}>{quotation.specialConsiderations}</p>
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
            { title: L.warranty, text: eff?.warrantyText },
            { title: L.responsibility, text: eff?.responsibilityText },
            { title: L.risks, text: eff?.risksText },
            { title: L.installation, text: eff?.installationText },
          ].map(({ title, text }) => text ? (
            <div key={title} className="pdf-no-break" style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "6px" }}>{title}</h3>
              <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{text}</div>
            </div>
          ) : null)}

          <div className="pdf-no-break" style={{ marginBottom: "14px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "6px" }}>{L.proposalValidity}</h3>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>
              {L.validityText(quotation.validityDays)}
              {eff?.validityText ? ` ${eff.validityText}` : ""}
            </div>
          </div>

          {eff?.returnsText ? (
            <div className="pdf-no-break" style={{ marginBottom: "14px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "6px" }}>{L.returnsAndCancellations}</h3>
              <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{eff.returnsText}</div>
            </div>
          ) : null}

          {eff?.legalClauses ? (
            <div className="pdf-no-break" style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0097A7", marginBottom: "6px", borderBottom: "2px solid #0097A7", paddingBottom: "4px" }}>
                {L.termsAndConditions}
              </h3>
              <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.7" }}>{eff.legalClauses}</div>
            </div>
          ) : null}

          {/* Datos para Orden de Compra */}
          <div className="pdf-no-break" style={{ marginBottom: "18px" }}>
            <p style={{ fontSize: "12px", margin: "0 0 8px 0", lineHeight: "1.7" }}>
              {L.purchaseOrderIntro}
            </p>
            <div style={{ fontSize: "12px", whiteSpace: "pre-line", lineHeight: "1.8", fontWeight: 500 }}>{eff?.purchaseOrderInfo ?? s.purchaseOrderInfo}</div>
            <div style={{ marginTop: "12px", fontSize: "12px", lineHeight: "1.7" }}>
              <p style={{ margin: "0 0 2px 0" }}>{L.attention(sigName)}</p>
              <p style={{ margin: "0 0 2px 0" }}>{L.phone} {sigPhone}</p>
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
