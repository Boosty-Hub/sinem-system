export interface AppUser {
  id: string;
  authUserId?: string;
  name: string;
  email: string;
  avatarUrl: string;
  phone: string;
  roleId?: string;
  status: "activo" | "inactivo";
}

export interface Prospect {
  id: string;
  code: string;
  cotorta: number;
  projectName: string;
  createdBy?: string;
  assignedTo?: string;
  clientId?: string;
  contactId?: string;
  directCustomer: string;
  endCustomer: string;
  proveedor: string;
  bu: string;
  product: string;
  scope: string;
  costUSD: number;
  priceUSD: number;
  go: number;
  get: number;
  probability: number;
  weighted: number;
  marginPercent: number;
  marginUSD: number;
  estimatedOE: string;
  revenue: string;
  comments: string;
  status: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  value: number;
  currentStep: number;
  createdAt: string;
  status: "activo" | "completado" | "pausado";
  prospectId?: string;
  quotationId?: string;
}

export const PROJECT_STEPS = [
  { number: 1, name: "Pedido", description: "Orden de compra del cliente" },
  { number: 2, name: "Oferta", description: "Oferta enviada al proveedor" },
  { number: 3, name: "Cálculo", description: "Cálculo de costos y márgenes" },
  { number: 4, name: "Facturas de Proveedores", description: "Facturas recibidas de Siemens" },
  { number: 5, name: "Pagos a Proveedores", description: "Pagos realizados a Siemens" },
  { number: 6, name: "Facturas a Cliente", description: "Facturas emitidas al cliente" },
  { number: 7, name: "Pagos del Cliente", description: "Pagos recibidos del cliente" },
  { number: 8, name: "Ingeniería", description: "Documentación técnica y planos" },
  { number: 9, name: "Entrega", description: "Logística y entrega de equipos" },
  { number: 10, name: "Diagramas de Gantt", description: "Cronograma del proyecto" },
  { number: 11, name: "Informaciones", description: "Información general del proyecto" },
] as const;

export interface PipelineStage {
  key: string;
  label: string;
  color: string;
}

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { key: "prospecto", label: "Prospectos", color: "bg-sinem-info" },
  { key: "propuesta", label: "Propuesta", color: "bg-sinem-teal" },
  { key: "negociacion", label: "Negociación", color: "bg-sinem-warning" },
  { key: "on_hold", label: "On Hold", color: "bg-sinem-orange" },
  { key: "ganado", label: "Ganado", color: "bg-sinem-success" },
  { key: "facturada", label: "Facturada", color: "bg-emerald-700" },
  { key: "perdido", label: "Perdido", color: "bg-destructive" },
];

/** @deprecated Use dynamic stages from localStorage instead */
export const PIPELINE_STAGES = DEFAULT_PIPELINE_STAGES;

export interface Client {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  industry: string;
  address: string;
  createdAt: string;
  totalProjects: number;
  totalRevenue: number;
  status: "activo" | "inactivo";
  originProspectId?: string;
  primaryContactId?: string;
}

export interface Contact {
  id: string;
  clientId?: string;
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  phone: string;
  mobile?: string;
  notes: string;
  createdAt: string;
  status: "activo" | "inactivo";
}

export type QuotationStatus = "borrador" | "enviada" | "aprobada" | "rechazada" | "vencida";

export type QuotationCurrency = "USD" | "DOP" | "EUR";

export type QuotationPartner = string;

export const DEFAULT_PARTNERS: string[] = ["Siemens", "NEM Energy", "Innomotics", "Trench Group"];

/** @deprecated Use dynamic partners from localStorage instead */
export const PARTNERS = DEFAULT_PARTNERS;

export const CURRENCIES: { key: QuotationCurrency; label: string; symbol: string }[] = [
  { key: "USD", label: "Dólar Americano", symbol: "$" },
  { key: "DOP", label: "Peso Dominicano", symbol: "RD$" },
  { key: "EUR", label: "Euro", symbol: "€" },
];

export type DeliveryTerm = "CIF" | "FOB" | "EXW" | "FCA" | "CFR" | "CPT" | "CIP" | "DAP" | "DPU" | "DDP";

export const DELIVERY_TERMS: { key: DeliveryTerm; label: string; description: string }[] = [
  { key: "EXW", label: "EXW", description: "Ex Works — En fábrica" },
  { key: "FCA", label: "FCA", description: "Free Carrier — Libre transportista" },
  { key: "FOB", label: "FOB", description: "Free On Board — Libre a bordo" },
  { key: "CFR", label: "CFR", description: "Cost and Freight — Costo y flete" },
  { key: "CIF", label: "CIF", description: "Cost, Insurance and Freight — Costo, seguro y flete" },
  { key: "CPT", label: "CPT", description: "Carriage Paid To — Transporte pagado hasta" },
  { key: "CIP", label: "CIP", description: "Carriage and Insurance Paid To — Transporte y seguro pagados hasta" },
  { key: "DAP", label: "DAP", description: "Delivered at Place — Entregado en lugar" },
  { key: "DPU", label: "DPU", description: "Delivered at Place Unloaded — Entregado en lugar descargado" },
  { key: "DDP", label: "DDP", description: "Delivered Duty Paid — Entregado con derechos pagados" },
];

export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceUSD: number;
  totalUSD: number;
}

export interface QuotationClient {
  company: string;
  attention: string;
  address: string;
  phone: string;
  email: string;
  rnc: string;
}

export interface Quotation {
  id: string;
  code: string;
  prospectId?: string;
  clientId?: string;
  contactId?: string;
  createdBy?: string;
  subject: string;
  client: QuotationClient;
  lineItems: QuotationLineItem[];
  subtotalUSD: number;
  applyItbis: boolean;
  itbisPercent: number;
  itbisUSD: number;
  totalUSD: number;
  currency: QuotationCurrency;
  exchangeRate: number;
  partner: QuotationPartner;
  costUSD: number;
  marginPercent: number;
  marginUSD: number;
  paymentTerms: string;
  deliveryTerms: DeliveryTerm;
  deliveryWeeksMin: number;
  deliveryWeeksMax: number;
  validityDays: number;
  deliveryLocation: string;
  notes: string;
  status: QuotationStatus;
  createdAt: string;
  version: number;
  history: QuotationSnapshot[];
  approvalStatus: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
}

export interface GeneralSettings {
  managerApprovalLimit: number;
  companyLogoUrl?: string;
}

export interface QuotationSnapshot {
  version: number;
  savedAt: string;
  modifiedBy?: string;
  code: string;
  subject: string;
  lineItems: QuotationLineItem[];
  subtotalUSD: number;
  totalUSD: number;
  costUSD: number;
  marginPercent: number;
  marginUSD: number;
  paymentTerms: string;
  deliveryTerms: DeliveryTerm;
  deliveryWeeksMin: number;
  deliveryWeeksMax: number;
  validityDays: number;
  deliveryLocation: string;
  notes: string;
  status: QuotationStatus;
}

export const QUOTATION_STATUSES: { key: QuotationStatus; label: string; color: string }[] = [
  { key: "borrador", label: "Borrador", color: "bg-muted-foreground" },
  { key: "enviada", label: "Enviada", color: "bg-sinem-info" },
  { key: "aprobada", label: "Aprobada", color: "bg-sinem-success" },
  { key: "rechazada", label: "Rechazada", color: "bg-destructive" },
  { key: "vencida", label: "Vencida", color: "bg-sinem-warning" },
];

export interface ProposalSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyRnc: string;
  logoUrl: string;
  defaultItbisPercent: number;
  greetingText: string;
  warrantyText: string;
  responsibilityText: string;
  risksText: string;
  installationText: string;
  validityText: string;
  returnsText: string;
  legalClauses: string;
  purchaseOrderInfo: string;
  closingText: string;
  coverIntroText: string;
  coverPartnerText: string;
  coverClosingText: string;
  signatureName: string;
  signatureTitle: string;
  signaturePhone: string;
  signatureEmail: string;
  signatureImageUrl: string;
  footerText: string;
}

export type OfferStatus = "borrador" | "enviada" | "en_negociacion" | "ganada" | "perdida";

export interface ClientOffer {
  id: string;
  code: string;
  clientId: string;
  contactId?: string;
  projectName: string;
  items: string;
  costUSD: number;
  priceUSD: number;
  marginPercent: number;
  marginUSD: number;
  status: OfferStatus;
  createdAt: string;
  validUntil: string;
  notes: string;
  convertedToProjectId?: string;
}

export const OFFER_STATUSES: { key: OfferStatus; label: string; color: string }[] = [
  { key: "borrador", label: "Borrador", color: "bg-muted-foreground" },
  { key: "enviada", label: "Enviada", color: "bg-sinem-info" },
  { key: "en_negociacion", label: "En Negociación", color: "bg-sinem-warning" },
  { key: "ganada", label: "Ganada", color: "bg-sinem-success" },
  { key: "perdida", label: "Perdida", color: "bg-destructive" },
];

export type TaskStatus = "pendiente" | "en_progreso" | "completada";
export type TaskPriority = "alta" | "media" | "baja";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  clientId?: string;
  projectId?: string;
  dueDate: string;
  createdAt: string;
  comments: TaskComment[];
}

export interface TaskComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export const TASK_STATUSES: { key: TaskStatus; label: string; color: string }[] = [
  { key: "pendiente", label: "Pendiente", color: "bg-sinem-warning" },
  { key: "en_progreso", label: "En Progreso", color: "bg-sinem-info" },
  { key: "completada", label: "Completada", color: "bg-sinem-success" },
];

export const TASK_PRIORITIES: { key: TaskPriority; label: string; color: string }[] = [
  { key: "alta", label: "Alta", color: "text-destructive" },
  { key: "media", label: "Media", color: "text-sinem-warning" },
  { key: "baja", label: "Baja", color: "text-muted-foreground" },
];

export const TEAM_MEMBERS = [
  "Gabriel Méndez",
  "Carlos Rodríguez",
  "Ana Martínez",
  "Luis Pérez",
  "María Santos",
];

export interface Product {
  id: string;
  name: string;
  category: string;
}

export interface ForecastMonth {
  month: string;
  target: number;
  actual: number;
  projected: number;
}

export interface ForecastYear {
  year: number;
  annualTarget: number;
  previousYearWon: number;
  revenueBudget: number;
  previousYearRevenue: number;
  marginBudget: number;
  previousYearMargin: number;
  months: ForecastMonth[];
}
