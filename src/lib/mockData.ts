import type { Prospect, Project } from "./types";

export const mockProspects: Prospect[] = [
  {
    id: "1", cotorta: 1, projectName: "Transformadores de Distribución", directCustomer: "Cliente AA",
    endCustomer: "Cliente AA", proveedor: "SIEMENS", bu: "SE", product: "Transformadores",
    scope: "3x Transformadores 500kVA 12.47/0.48kV", costUSD: 51750, priceUSD: 63150,
    go: 80, get: 60, probability: 48, weighted: 30312, marginPercent: 18, marginUSD: 11400,
    estimatedOE: "Mar 26", revenue: 63150, comments: "Pendiente aprobación del presupuesto", status: "propuesta"
  },
  {
    id: "2", cotorta: 2, projectName: "Motor Siemens 250HP", directCustomer: "Cervecería Nacional",
    endCustomer: "Cervecería Nacional", proveedor: "SIEMENS", bu: "DI", product: "Motores",
    scope: "1x Motor Simatic 250HP 460V", costUSD: 18500, priceUSD: 28500,
    go: 90, get: 70, probability: 63, weighted: 17955, marginPercent: 35, marginUSD: 10000,
    estimatedOE: "Feb 26", revenue: 28500, comments: "Negociación avanzada", status: "negociacion"
  },
  {
    id: "3", cotorta: 3, projectName: "Switchgear 13.8kV", directCustomer: "AES Dominicana",
    endCustomer: "AES Dominicana", proveedor: "SIEMENS", bu: "SE", product: "Switchgear",
    scope: "Switchgear tipo Posto 13.8kV con 4 celdas", costUSD: 85000, priceUSD: 120000,
    go: 60, get: 40, probability: 24, weighted: 28800, marginPercent: 29, marginUSD: 35000,
    estimatedOE: "Jun 26", revenue: 120000, comments: "", status: "prospecto"
  },
  {
    id: "4", cotorta: 4, projectName: "Variadores de Frecuencia", directCustomer: "Grupo Rica",
    endCustomer: "Grupo Rica", proveedor: "SIEMENS", bu: "DI", product: "Drives",
    scope: "5x Variadores Sinamics G120 15kW", costUSD: 9800, priceUSD: 15800,
    go: 100, get: 90, probability: 90, weighted: 14220, marginPercent: 38, marginUSD: 6000,
    estimatedOE: "Ene 26", revenue: 15800, comments: "OC recibida", status: "ganado"
  },
  {
    id: "5", cotorta: 5, projectName: "PLC Simatic S7-1500", directCustomer: "Barrick Gold",
    endCustomer: "Barrick Gold", proveedor: "SIEMENS", bu: "DI", product: "Automatización",
    scope: "Sistema PLC S7-1500 con HMI", costUSD: 22000, priceUSD: 32000,
    go: 30, get: 20, probability: 6, weighted: 1920, marginPercent: 31, marginUSD: 10000,
    estimatedOE: "Abr 26", revenue: 32000, comments: "Competencia fuerte con ABB", status: "perdido"
  },
  {
    id: "6", cotorta: 6, projectName: "Subestación Compacta", directCustomer: "CEMEX RD",
    endCustomer: "CEMEX RD", proveedor: "SIEMENS", bu: "SE", product: "Subestaciones",
    scope: "Subestación compacta 34.5/4.16kV 5MVA", costUSD: 180000, priceUSD: 245000,
    go: 70, get: 50, probability: 35, weighted: 85750, marginPercent: 27, marginUSD: 65000,
    estimatedOE: "Jul 26", revenue: 245000, comments: "Esperando especificación final", status: "propuesta"
  },
  {
    id: "7", cotorta: 7, projectName: "Centro de Control de Motores", directCustomer: "Falcondo",
    endCustomer: "Falcondo", proveedor: "SIEMENS", bu: "DI", product: "MCC",
    scope: "MCC con 12 salidas de motor", costUSD: 42000, priceUSD: 58000,
    go: 85, get: 65, probability: 55, weighted: 31900, marginPercent: 28, marginUSD: 16000,
    estimatedOE: "May 26", revenue: 58000, comments: "Revisión técnica en proceso", status: "negociacion"
  },
  {
    id: "8", cotorta: 8, projectName: "Protecciones SIPROTEC", directCustomer: "EDEESTE",
    endCustomer: "EDEESTE", proveedor: "SIEMENS", bu: "SE", product: "Protecciones",
    scope: "6x Relés SIPROTEC 7SJ85", costUSD: 36000, priceUSD: 48000,
    go: 50, get: 30, probability: 15, weighted: 7200, marginPercent: 25, marginUSD: 12000,
    estimatedOE: "Ago 26", revenue: 48000, comments: "", status: "prospecto"
  },
];

export const mockProjects: Project[] = [
  { id: "p1", name: "Subestación Eléctrica CEMEX", client: "CEMEX RD", value: 245000, currentStep: 5, createdAt: "2025-09-15", status: "activo" },
  { id: "p2", name: "Automatización Línea 3", client: "Cervecería Nacional", value: 28500, currentStep: 3, createdAt: "2025-11-02", status: "activo" },
  { id: "p3", name: "Switchgear AES", client: "AES Dominicana", value: 120000, currentStep: 8, createdAt: "2025-07-20", status: "activo" },
  { id: "p4", name: "Drives Grupo Rica", client: "Grupo Rica", value: 15800, currentStep: 11, createdAt: "2025-10-10", status: "completado" },
];
