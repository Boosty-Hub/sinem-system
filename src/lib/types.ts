export interface Prospect {
  id: string;
  cotorta: number;
  projectName: string;
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
  revenue: number;
  comments: string;
  status: "prospecto" | "propuesta" | "negociacion" | "ganado" | "perdido";
}

export interface Project {
  id: string;
  name: string;
  client: string;
  value: number;
  currentStep: number;
  createdAt: string;
  status: "activo" | "completado" | "pausado";
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

export const PIPELINE_STAGES = [
  { key: "prospecto" as const, label: "Prospectos", color: "bg-sinem-info" },
  { key: "propuesta" as const, label: "Propuesta", color: "bg-sinem-teal" },
  { key: "negociacion" as const, label: "Negociación", color: "bg-sinem-warning" },
  { key: "ganado" as const, label: "Ganado", color: "bg-sinem-success" },
  { key: "perdido" as const, label: "Perdido", color: "bg-destructive" },
];
