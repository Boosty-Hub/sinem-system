import type { Prospect, Client, Contact, Product, PipelineStage } from "./types";
import type { Tables } from "@/integrations/supabase/types";

// ── Prospect ──
type DbProspect = Tables<"prospects">;

export const dbToProspect = (row: DbProspect): Prospect => ({
  id: row.id,
  code: row.code,
  cotorta: row.cotorta,
  projectName: row.project_name,
  directCustomer: row.direct_customer,
  endCustomer: row.end_customer,
  proveedor: row.proveedor,
  bu: row.bu,
  product: row.product,
  scope: row.scope,
  costUSD: Number(row.cost_usd),
  priceUSD: Number(row.price_usd),
  go: Number(row.go_percent),
  get: Number(row.get_percent),
  probability: Number(row.probability),
  weighted: Number(row.weighted),
  marginPercent: Number(row.margin_percent),
  marginUSD: Number(row.margin_usd),
  estimatedOE: row.estimated_oe,
  revenue: row.revenue,
  comments: row.comments,
  status: row.status,
  createdBy: row.created_by ?? undefined,
  assignedTo: row.assigned_to ?? undefined,
  clientId: row.client_id ?? undefined,
  contactId: row.contact_id ?? undefined,
});

export const prospectToDb = (p: Prospect): Omit<DbProspect, "created_at" | "updated_at"> => ({
  id: p.id,
  code: p.code,
  cotorta: p.cotorta,
  project_name: p.projectName,
  direct_customer: p.directCustomer,
  end_customer: p.endCustomer,
  proveedor: p.proveedor,
  bu: p.bu,
  product: p.product,
  scope: p.scope,
  cost_usd: p.costUSD,
  price_usd: p.priceUSD,
  go_percent: p.go,
  get_percent: p.get,
  probability: p.probability,
  weighted: p.weighted,
  margin_percent: p.marginPercent,
  margin_usd: p.marginUSD,
  estimated_oe: p.estimatedOE,
  revenue: p.revenue,
  comments: p.comments,
  status: p.status,
  created_by: p.createdBy ?? null,
  assigned_to: p.assignedTo ?? null,
  client_id: p.clientId ?? null,
  contact_id: p.contactId ?? null,
});

// ── Client ──
type DbClient = Tables<"clients">;

export const dbToClient = (row: DbClient): Client => ({
  id: row.id,
  name: row.name,
  contactName: row.contact_name,
  contactEmail: row.contact_email,
  contactPhone: row.contact_phone,
  industry: row.industry,
  address: row.address,
  createdAt: row.created_at,
  totalProjects: row.total_projects,
  totalRevenue: Number(row.total_revenue),
  status: row.status as Client["status"],
  originProspectId: row.origin_prospect_id ?? undefined,
  primaryContactId: (row as any).primary_contact_id ?? undefined,
});

export const clientToDb = (c: Client) => ({
  id: c.id,
  name: c.name,
  contact_name: c.contactName,
  contact_email: c.contactEmail,
  contact_phone: c.contactPhone,
  industry: c.industry,
  address: c.address,
  total_projects: c.totalProjects,
  total_revenue: c.totalRevenue,
  status: c.status,
  origin_prospect_id: c.originProspectId ?? null,
  primary_contact_id: c.primaryContactId ?? null,
});

// ── Contact ──
type DbContact = Tables<"contacts">;

export const dbToContact = (row: DbContact): Contact => ({
  id: row.id,
  clientId: row.client_id ?? undefined,
  firstName: row.first_name,
  lastName: row.last_name,
  position: row.position,
  email: row.email,
  phone: row.phone,
  mobile: row.mobile ?? undefined,
  notes: row.notes,
  createdAt: row.created_at,
  status: row.status as Contact["status"],
});

export const contactToDb = (c: Contact) => ({
  id: c.id,
  client_id: c.clientId ?? null,
  first_name: c.firstName,
  last_name: c.lastName,
  position: c.position,
  email: c.email,
  phone: c.phone,
  mobile: c.mobile ?? null,
  notes: c.notes,
  status: c.status,
});

// ── Product ──
type DbProduct = Tables<"products">;

export const dbToProduct = (row: DbProduct): Product => ({
  id: row.id,
  name: row.name,
  category: row.category,
});

// ── Pipeline Stage ──
type DbStage = Tables<"pipeline_stages">;

export const dbToStage = (row: DbStage): PipelineStage => ({
  key: row.key,
  label: row.label,
  color: row.color,
});
