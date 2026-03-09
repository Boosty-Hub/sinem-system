import type { AppUser, Prospect, Project, Client, Contact, Quotation, ClientOffer, ProposalSettings, Task, Product, ForecastYear } from "./types";

export const mockAppUsers: AppUser[] = [
  { id: "u1", authUserId: "auth-1", name: "Gabriel Méndez", email: "gabriel@sinem.energy", avatarUrl: "", phone: "+1 809 555-0001", status: "activo" },
  { id: "u2", authUserId: "auth-2", name: "Carlos Rodríguez", email: "carlos@sinem.energy", avatarUrl: "", phone: "+1 809 555-0002", status: "activo" },
  { id: "u3", authUserId: "auth-3", name: "Ana Martínez", email: "ana@sinem.energy", avatarUrl: "", phone: "+1 809 555-0003", status: "activo" },
  { id: "u4", authUserId: "auth-4", name: "Luis Pérez", email: "luis@sinem.energy", avatarUrl: "", phone: "+1 809 555-0004", status: "activo" },
  { id: "u5", authUserId: "auth-5", name: "María Santos", email: "maria@sinem.energy", avatarUrl: "", phone: "+1 809 555-0005", status: "activo" },
];

export const mockProspects: Prospect[] = [
  {
    id: "1", code: "", cotorta: 1, projectName: "Transformadores de Distribución", directCustomer: "Cliente AA",
    endCustomer: "Cliente AA", proveedor: "SIEMENS", bu: "SE", product: "Transformadores",
    scope: "3x Transformadores 500kVA 12.47/0.48kV", costUSD: 51750, priceUSD: 63150,
    go: 80, get: 60, probability: 48, weighted: 30312, marginPercent: 18, marginUSD: 11400,
    estimatedOE: "2026-03-15", revenue: "2026-05-15", comments: "Pendiente aprobación del presupuesto", status: "propuesta",
    createdBy: "u1"
  },
  {
    id: "2", code: "", cotorta: 2, projectName: "Motor Siemens 250HP", directCustomer: "Cervecería Nacional",
    endCustomer: "Cervecería Nacional", proveedor: "SIEMENS", bu: "DI", product: "Motores",
    scope: "1x Motor Simatic 250HP 460V", costUSD: 18500, priceUSD: 28500,
    go: 90, get: 70, probability: 63, weighted: 17955, marginPercent: 35, marginUSD: 10000,
    estimatedOE: "2026-02-20", revenue: "2026-03-20", comments: "Negociación avanzada", status: "negociacion",
    createdBy: "u2"
  },
  {
    id: "3", code: "", cotorta: 3, projectName: "Switchgear 13.8kV", directCustomer: "AES Dominicana",
    endCustomer: "AES Dominicana", proveedor: "SIEMENS", bu: "SE", product: "Switchgear",
    scope: "Switchgear tipo Posto 13.8kV con 4 celdas", costUSD: 85000, priceUSD: 120000,
    go: 60, get: 40, probability: 24, weighted: 28800, marginPercent: 29, marginUSD: 35000,
    estimatedOE: "2026-06-01", revenue: "2026-10-01", comments: "", status: "prospecto",
    createdBy: "u1"
  },
  {
    id: "4", code: "", cotorta: 4, projectName: "Variadores de Frecuencia", directCustomer: "Grupo Rica",
    endCustomer: "Grupo Rica", proveedor: "SIEMENS", bu: "DI", product: "Drives",
    scope: "5x Variadores Sinamics G120 15kW", costUSD: 9800, priceUSD: 15800,
    go: 100, get: 90, probability: 90, weighted: 14220, marginPercent: 38, marginUSD: 6000,
    estimatedOE: "2026-01-15", revenue: "2026-02-15", comments: "OC recibida", status: "ganado",
    createdBy: "u3"
  },
  {
    id: "5", code: "", cotorta: 5, projectName: "PLC Simatic S7-1500", directCustomer: "Barrick Gold",
    endCustomer: "Barrick Gold", proveedor: "SIEMENS", bu: "DI", product: "Automatización",
    scope: "Sistema PLC S7-1500 con HMI", costUSD: 22000, priceUSD: 32000,
    go: 30, get: 20, probability: 6, weighted: 1920, marginPercent: 31, marginUSD: 10000,
    estimatedOE: "2026-04-10", revenue: "2026-06-10", comments: "Competencia fuerte con ABB", status: "perdido",
    createdBy: "u4"
  },
  {
    id: "6", code: "", cotorta: 6, projectName: "Subestación Compacta", directCustomer: "CEMEX RD",
    endCustomer: "CEMEX RD", proveedor: "SIEMENS", bu: "SE", product: "Subestaciones",
    scope: "Subestación compacta 34.5/4.16kV 5MVA", costUSD: 180000, priceUSD: 245000,
    go: 70, get: 50, probability: 35, weighted: 85750, marginPercent: 27, marginUSD: 65000,
    estimatedOE: "2026-07-01", revenue: "2026-11-01", comments: "Esperando especificación final", status: "propuesta",
    createdBy: "u2"
  },
  {
    id: "7", code: "", cotorta: 7, projectName: "Centro de Control de Motores", directCustomer: "Falcondo",
    endCustomer: "Falcondo", proveedor: "SIEMENS", bu: "DI", product: "MCC",
    scope: "MCC con 12 salidas de motor", costUSD: 42000, priceUSD: 58000,
    go: 85, get: 65, probability: 55, weighted: 31900, marginPercent: 28, marginUSD: 16000,
    estimatedOE: "2026-05-15", revenue: "2026-07-15", comments: "Revisión técnica en proceso", status: "negociacion",
    createdBy: "u1"
  },
  {
    id: "8", code: "", cotorta: 8, projectName: "Protecciones SIPROTEC", directCustomer: "EDEESTE",
    endCustomer: "EDEESTE", proveedor: "SIEMENS", bu: "SE", product: "Protecciones",
    scope: "6x Relés SIPROTEC 7SJ85", costUSD: 36000, priceUSD: 48000,
    go: 50, get: 30, probability: 15, weighted: 7200, marginPercent: 25, marginUSD: 12000,
    estimatedOE: "2026-08-01", revenue: "2026-10-01", comments: "", status: "prospecto",
    createdBy: "u5"
  },
];

export const mockProjects: Project[] = [
  { id: "p1", name: "Subestación Eléctrica CEMEX", client: "CEMEX RD", value: 245000, currentStep: 5, createdAt: "2025-09-15", status: "activo" },
  { id: "p2", name: "Automatización Línea 3", client: "Cervecería Nacional", value: 28500, currentStep: 3, createdAt: "2025-11-02", status: "activo" },
  { id: "p3", name: "Switchgear AES", client: "AES Dominicana", value: 120000, currentStep: 8, createdAt: "2025-07-20", status: "activo" },
  { id: "p4", name: "Drives Grupo Rica", client: "Grupo Rica", value: 15800, currentStep: 11, createdAt: "2025-10-10", status: "completado" },
];

export const mockClients: Client[] = [
  {
    id: "c1", name: "Grupo Rica", contactName: "Carlos Méndez", contactEmail: "cmendez@gruporica.com",
    contactPhone: "809-555-0101", industry: "Alimentos y Bebidas", address: "Santo Domingo, RD",
    createdAt: "2025-10-10", totalProjects: 1, totalRevenue: 15800, status: "activo", originProspectId: "4"
  },
  {
    id: "c2", name: "CEMEX RD", contactName: "Ana Rodríguez", contactEmail: "arodriguez@cemex.com",
    contactPhone: "809-555-0202", industry: "Construcción", address: "San Pedro de Macorís, RD",
    createdAt: "2025-09-15", totalProjects: 1, totalRevenue: 245000, status: "activo"
  },
  {
    id: "c3", name: "Cervecería Nacional", contactName: "Miguel Torres", contactEmail: "mtorres@cnd.com.do",
    contactPhone: "809-555-0303", industry: "Manufactura", address: "Santo Domingo, RD",
    createdAt: "2025-11-02", totalProjects: 1, totalRevenue: 28500, status: "activo"
  },
  {
    id: "c4", name: "AES Dominicana", contactName: "Laura Peña", contactEmail: "lpena@aes.com",
    contactPhone: "809-555-0404", industry: "Energía", address: "Santiago, RD",
    createdAt: "2025-07-20", totalProjects: 1, totalRevenue: 120000, status: "activo"
  },
  {
    id: "c5", name: "Falcondo", contactName: "Roberto Díaz", contactEmail: "rdiaz@falcondo.com",
    contactPhone: "809-555-0505", industry: "Minería", address: "Bonao, RD",
    createdAt: "2025-12-01", totalProjects: 0, totalRevenue: 0, status: "activo"
  },
];

export const mockContacts: Contact[] = [
  {
    id: "ct1", clientId: "c1", firstName: "Carlos", lastName: "Méndez",
    position: "Gerente de Planta", email: "cmendez@gruporica.com", phone: "809-555-0101",
    mobile: "809-555-9901", notes: "Contacto principal para proyectos eléctricos", createdAt: "2025-10-10", status: "activo"
  },
  {
    id: "ct2", clientId: "c1", firstName: "María", lastName: "Santana",
    position: "Jefa de Compras", email: "msantana@gruporica.com", phone: "809-555-0102",
    notes: "Maneja órdenes de compra y pagos", createdAt: "2025-11-15", status: "activo"
  },
  {
    id: "ct3", clientId: "c2", firstName: "Ana", lastName: "Rodríguez",
    position: "Gerente de Ingeniería", email: "arodriguez@cemex.com", phone: "809-555-0202",
    mobile: "809-555-9902", notes: "Aprueba especificaciones técnicas", createdAt: "2025-09-15", status: "activo"
  },
  {
    id: "ct4", clientId: "c2", firstName: "José", lastName: "Ramírez",
    position: "Director de Operaciones", email: "jramirez@cemex.com", phone: "809-555-0203",
    notes: "Toma decisiones de inversión", createdAt: "2025-09-20", status: "activo"
  },
  {
    id: "ct5", clientId: "c3", firstName: "Miguel", lastName: "Torres",
    position: "Jefe de Mantenimiento", email: "mtorres@cnd.com.do", phone: "809-555-0303",
    mobile: "809-555-9903", notes: "Contacto técnico principal", createdAt: "2025-11-02", status: "activo"
  },
  {
    id: "ct6", clientId: "c4", firstName: "Laura", lastName: "Peña",
    position: "Ingeniera de Proyectos", email: "lpena@aes.com", phone: "809-555-0404",
    notes: "", createdAt: "2025-07-20", status: "activo"
  },
  {
    id: "ct7", clientId: "c5", firstName: "Roberto", lastName: "Díaz",
    position: "Superintendente Eléctrico", email: "rdiaz@falcondo.com", phone: "809-555-0505",
    mobile: "809-555-9905", notes: "Responsable de proyectos eléctricos en mina", createdAt: "2025-12-01", status: "activo"
  },
  {
    id: "ct8", firstName: "Sindys", lastName: "Batista",
    position: "Gerente de Compras", email: "sbatista@egehaina.com", phone: "809-555-0606",
    notes: "Contacto de Egehaina, aún no es cliente formal", createdAt: "2026-01-05", status: "activo"
  },
  {
    id: "ct9", firstName: "Pedro", lastName: "Gómez",
    position: "Director Técnico", email: "pgomez@clienteaa.com", phone: "809-555-1100",
    notes: "Prospecto en evaluación", createdAt: "2026-01-08", status: "activo"
  },
];

export const mockProposalSettings: ProposalSettings = {
  companyName: "SINEM S.R.L.",
  companyAddress: "Winston Churchill Acrópolis Business Mall floor 8, Piantini CP 10127, Santo Domingo, Dominican Republic",
  companyPhone: "+1809 9148887",
  companyEmail: "omar.laredo@sinem.energy",
  companyWebsite: "www.sinem.energy",
  companyRnc: "1-31-12345-6",
  logoUrl: "/logo-sinem.svg",
  defaultItbisPercent: 18,
  coverIntroText: "Atendiendo a su apreciable solicitud de propuesta y de acuerdo con sus necesidades, nos permitimos poner a su consideración nuestra mejor propuesta técnica y comercial con los mejores equipos de la marca SIEMENS.",
  coverPartnerText: "SINEM como Business Partner oficial de SIEMENS en la República Dominicana le garantiza que los equipos serán fabricados e instalados de acuerdo con sus necesidades, bajo un estricto programa de calidad en sus procesos y en sus componentes.",
  coverClosingText: "Sin otro particular, quedamos a sus órdenes para cualquier duda o aclaración, brindándole como siempre un excelente servicio.",
  greetingText: "Estimados señores, de acuerdo a su solicitud, nos complace presentarles nuestra oferta para el suministro de los equipos y servicios detallados a continuación:",
  warrantyText: "El equipo cuenta con 12 (doce) meses de garantía a partir de la puesta en servicio o 18 (dieciocho) meses contados a partir de la entrega del suministro, lo que ocurra primero.\n\nEn caso de que la entrega del suministro no pueda ser realizada por causas no imputables a SINEM, el plazo de garantía iniciará a partir de la fecha de aviso de disponibilidad para el embarque.\n\nPara el caso de los servicios, éstos contarán con 30 días de garantía a partir de la fecha en que éstos hayan sido ejecutados.",
  responsibilityText: "SINEM no será, en caso alguno y en ninguna circunstancia, responsable de cualquier pérdida de uso o producción, pérdida de utilidad, costo o capital, pérdida de intereses o ingresos, costo de energía comprada o reemplazada o por cualesquiera daños o pérdidas indirectas o consecuenciales.",
  risksText: "En caso de que el equipo sufra algún daño físico o eléctrico en sus partes y/o en su operación por mal manejo de parte del cliente, SINEM no se responsabilizará de las fallas que presenten los suministros/servicios objeto de esta propuesta, anulándose automáticamente la garantía.\n\nEn caso de que el cliente detecte algún daño en los equipos u omisiones en partes y/o accesorios de estos, deberá reportarlos en un plazo máximo de 15 (quince) días naturales a SINEM, de lo contrario, la empresa no responderá por reclamos posteriores.",
  installationText: "La instalación no está incluida en esta oferta. De requerirse, favor solicitar cotización por separado. SINEM cuenta con personal técnico calificado para la instalación y puesta en marcha de los equipos.",
  validityText: "La validez de esta propuesta es de 30 días, a partir de la fecha de emisión de la presente propuesta. Después de este período será sin compromiso alguno para SINEM.",
  returnsText: "No se admiten devoluciones ni cancelaciones sin autorización escrita de SINEM, en cuyo caso deberá pagar por los gastos y costos que SINEM le notifique. Para Mercancías de fabricación especial nos reservamos el derecho de cargar hasta el 100%.",
  legalClauses: "1. Los precios están sujetos a disponibilidad y confirmación al momento de la orden de compra.\n2. Cualquier modificación al alcance original puede generar ajustes en precio y tiempo de entrega.\n3. SINEM no se hace responsable por daños causados por uso inadecuado, instalación incorrecta o condiciones fuera de las especificaciones técnicas.\n4. En caso de cancelación de la orden, se aplicará un cargo del 15% del valor total como penalidad.\n5. Esta oferta se rige por las leyes de la República Dominicana.",
  purchaseOrderInfo: "SINEM SRL\nRNC: 1-33-03034-9\nWinston Churchill Acropolis Business Mall\nPiantini, CP 10127, Santo Domingo, Distrito Nacional, Republica Dominicana",
  closingText: "Sin otro particular de momento y en espera de sus noticias, nos despedimos de Usted quedando como siempre a sus apreciables órdenes.",
  signatureName: "Omar Laredo",
  signatureTitle: "Director General",
  signaturePhone: "+1 809 914-8887",
  signatureEmail: "omar.laredo@sinem.energy",
  signatureImageUrl: "",
  footerText: "SINEM SRL, Winston Churchill Acrópolis Business Mall floor 8, Piantini CP 10127, Santo Domingo, Dominican Republic,\nPhone +1809 9148887",
};

export const mockQuotations: Quotation[] = [
  {
    id: "q1", code: "COT-2026-001", prospectId: "1",
    subject: "Suministro de Transformadores de Distribución 500kVA",
    client: { company: "Cliente AA", attention: "Ing. Pedro Gómez", address: "Av. Industrial #45, Santiago, RD", phone: "809-555-1100", email: "pgomez@clienteaa.com", rnc: "1-01-98765-4" },
    lineItems: [
      { id: "li1", description: "Transformador de distribución 500kVA 12.47/0.48kV, tipo pad-mounted, ONAN", quantity: 3, unitPriceUSD: 18500, totalUSD: 55500 },
      { id: "li2", description: "Accesorios de conexión y protección (pararrayos, fusibles, conectores)", quantity: 3, unitPriceUSD: 1550, totalUSD: 4650 },
      { id: "li3", description: "Transporte e inspección en fábrica", quantity: 1, unitPriceUSD: 3000, totalUSD: 3000 },
    ],
    subtotalUSD: 63150, applyItbis: true, itbisPercent: 18, itbisUSD: 11367, totalUSD: 74517,
    currency: "USD", exchangeRate: 1, partner: "Siemens",
    costUSD: 51750, marginPercent: 18, marginUSD: 11400,
    paymentTerms: "50% con la orden de compra, 50% contra entrega",
    deliveryTerms: "CIF",
    deliveryWeeksMin: 8, deliveryWeeksMax: 10,
    validityDays: 30, deliveryLocation: "Santiago, República Dominicana",
    notes: "Pendiente aprobación del presupuesto del cliente",
    status: "enviada", createdAt: "2026-01-10", version: 3, createdBy: "u1", approvalStatus: "pending", history: [
      {
        version: 1, savedAt: "2026-01-10", modifiedBy: "u1", code: "COT-2026-001",
        subject: "Suministro de Transformadores de Distribución 500kVA",
        lineItems: [
          { id: "li1", description: "Transformador de distribución 500kVA 12.47/0.48kV, tipo pad-mounted, ONAN", quantity: 3, unitPriceUSD: 17000, totalUSD: 51000 },
          { id: "li2", description: "Accesorios de conexión y protección", quantity: 3, unitPriceUSD: 1200, totalUSD: 3600 },
        ],
        subtotalUSD: 54600, totalUSD: 64428, costUSD: 45000, marginPercent: 18, marginUSD: 9600,
        paymentTerms: "100% con la orden de compra",
        deliveryTerms: "FOB",
        deliveryWeeksMin: 10, deliveryWeeksMax: 12,
        validityDays: 30, deliveryLocation: "Santiago, República Dominicana",
        notes: "Primera versión - precios estimados", status: "borrador",
      },
      {
        version: 2, savedAt: "2026-01-18", modifiedBy: "u2", code: "COT-2026-001",
        subject: "Suministro de Transformadores de Distribución 500kVA",
        lineItems: [
          { id: "li1", description: "Transformador de distribución 500kVA 12.47/0.48kV, tipo pad-mounted, ONAN", quantity: 3, unitPriceUSD: 18000, totalUSD: 54000 },
          { id: "li2", description: "Accesorios de conexión y protección (pararrayos, fusibles, conectores)", quantity: 3, unitPriceUSD: 1400, totalUSD: 4200 },
          { id: "li3", description: "Transporte e inspección en fábrica", quantity: 1, unitPriceUSD: 2800, totalUSD: 2800 },
        ],
        subtotalUSD: 61000, totalUSD: 71980, costUSD: 49500, marginPercent: 19, marginUSD: 11500,
        paymentTerms: "50% con la orden de compra, 50% contra entrega",
        deliveryTerms: "CIF",
        deliveryWeeksMin: 8, deliveryWeeksMax: 10,
        validityDays: 30, deliveryLocation: "Santiago, República Dominicana",
        notes: "Ajuste de precios con Siemens, se agregó transporte", status: "enviada",
      },
    ]
  },
  {
    id: "q2", code: "COT-2026-002", prospectId: "2",
    subject: "Suministro de Motor Siemens 250HP para Línea de Producción",
    client: { company: "Cervecería Nacional", attention: "Ing. Miguel Torres", address: "Autopista 30 de Mayo, Santo Domingo, RD", phone: "809-555-0303", email: "mtorres@cnd.com.do", rnc: "1-01-55555-3" },
    lineItems: [
      { id: "li4", description: "Motor Siemens 1LE1 250HP 460V 1785RPM, eficiencia premium IE3", quantity: 1, unitPriceUSD: 24500, totalUSD: 24500 },
      { id: "li5", description: "Acoplamiento flexible y base de motor", quantity: 1, unitPriceUSD: 2500, totalUSD: 2500 },
      { id: "li6", description: "Sensores de vibración y temperatura PT100", quantity: 1, unitPriceUSD: 1500, totalUSD: 1500 },
    ],
    subtotalUSD: 28500, applyItbis: true, itbisPercent: 18, itbisUSD: 5130, totalUSD: 33630,
    currency: "USD", exchangeRate: 1, partner: "Innomotics",
    costUSD: 18500, marginPercent: 35, marginUSD: 10000,
    paymentTerms: "100% con la orden de compra",
    deliveryTerms: "FOB",
    deliveryWeeksMin: 4, deliveryWeeksMax: 6,
    validityDays: 30, deliveryLocation: "Santo Domingo, República Dominicana",
    notes: "Negociación avanzada con el cliente",
    status: "enviada", createdAt: "2026-01-15", version: 1, createdBy: "u2", approvalStatus: "pending", history: []
  },
  {
    id: "q3", code: "COT-2026-003", prospectId: "3",
    subject: "Suministro de Switchgear 13.8kV tipo Posto",
    client: { company: "AES Dominicana", attention: "Ing. Laura Peña", address: "Av. Los Próceres, Santiago, RD", phone: "809-555-0404", email: "lpena@aes.com", rnc: "1-01-77777-7" },
    lineItems: [
      { id: "li7", description: "Celda de línea 13.8kV, 630A, 25kA con seccionador de puesta a tierra", quantity: 2, unitPriceUSD: 28000, totalUSD: 56000 },
      { id: "li8", description: "Celda de protección 13.8kV con interruptor de vacío y relé SIPROTEC", quantity: 2, unitPriceUSD: 32000, totalUSD: 64000 },
    ],
    subtotalUSD: 120000, applyItbis: false, itbisPercent: 18, itbisUSD: 0, totalUSD: 120000,
    currency: "DOP", exchangeRate: 58.50, partner: "Siemens",
    costUSD: 85000, marginPercent: 29, marginUSD: 35000,
    paymentTerms: "30% anticipo, 40% contra embarque, 30% contra entrega",
    deliveryTerms: "CIF",
    deliveryWeeksMin: 14, deliveryWeeksMax: 16,
    validityDays: 45, deliveryLocation: "Santiago, República Dominicana",
    notes: "",
    status: "borrador", createdAt: "2026-01-20", version: 1, createdBy: "u1", approvalStatus: "pending", history: []
  },
  {
    id: "q4", code: "COT-2026-004", prospectId: "4",
    subject: "Suministro de Variadores de Frecuencia Sinamics G120",
    client: { company: "Grupo Rica", attention: "Ing. Carlos Méndez", address: "Av. Luperón, Santo Domingo, RD", phone: "809-555-0101", email: "cmendez@gruporica.com", rnc: "1-01-33333-1" },
    lineItems: [
      { id: "li9", description: "Variador de frecuencia Sinamics G120 15kW 480V, con panel de operador BOP-2", quantity: 5, unitPriceUSD: 2800, totalUSD: 14000 },
      { id: "li10", description: "Filtro de armónicos y reactancia de línea", quantity: 5, unitPriceUSD: 360, totalUSD: 1800 },
    ],
    subtotalUSD: 15800, applyItbis: true, itbisPercent: 18, itbisUSD: 2844, totalUSD: 18644,
    currency: "USD", exchangeRate: 1, partner: "Siemens",
    costUSD: 9800, marginPercent: 38, marginUSD: 6000,
    paymentTerms: "100% con la orden de compra",
    deliveryTerms: "EXW",
    deliveryWeeksMin: 3, deliveryWeeksMax: 4,
    validityDays: 30, deliveryLocation: "Santo Domingo, República Dominicana",
    notes: "OC recibida",
    status: "aprobada", createdAt: "2025-12-20", version: 1, createdBy: "u3", approvalStatus: "approved", approvedBy: "u1", approvedAt: "2025-12-22", history: []
  },
];

export const mockClientOffers: ClientOffer[] = [
  {
    id: "co1", code: "OFR-2026-001", clientId: "c1", projectName: "Variadores Línea de Empaque",
    items: "3x Sinamics G120 7.5kW + Panel", costUSD: 8500, priceUSD: 12800,
    marginPercent: 34, marginUSD: 4300, status: "enviada",
    createdAt: "2026-02-01", validUntil: "2026-03-01", notes: "Ampliación línea de empaque"
  },
  {
    id: "co2", code: "OFR-2026-002", clientId: "c2", projectName: "Ampliación Subestación CEMEX",
    items: "2x Celdas adicionales 13.8kV", costUSD: 45000, priceUSD: 62000,
    marginPercent: 27, marginUSD: 17000, status: "en_negociacion",
    createdAt: "2026-01-28", validUntil: "2026-03-28", notes: "Segunda fase del proyecto"
  },
  {
    id: "co3", code: "OFR-2026-003", clientId: "c3", projectName: "Motores Línea 5",
    items: "2x Motor 150HP + 1x Motor 100HP", costUSD: 24000, priceUSD: 35000,
    marginPercent: 31, marginUSD: 11000, status: "borrador",
    createdAt: "2026-02-10", validUntil: "2026-04-10", notes: "Nueva línea de producción"
  },
  {
    id: "co4", code: "OFR-2026-004", clientId: "c4", projectName: "Protecciones Subestación Norte",
    items: "4x Relés SIPROTEC 7SJ85", costUSD: 24000, priceUSD: 33000,
    marginPercent: 27, marginUSD: 9000, status: "ganada",
    createdAt: "2026-01-15", validUntil: "2026-02-15", notes: "OC confirmada", convertedToProjectId: "p3"
  },
  {
    id: "co5", code: "OFR-2026-005", clientId: "c1", projectName: "Automatización Pasteurización",
    items: "PLC S7-1200 + HMI KTP700 + Instrumentación", costUSD: 18000, priceUSD: 26500,
    marginPercent: 32, marginUSD: 8500, status: "en_negociacion",
    createdAt: "2026-02-05", validUntil: "2026-04-05", notes: "Proyecto de mejora continua"
  },
  {
    id: "co6", code: "OFR-2026-006", clientId: "c2", projectName: "Banco de Capacitores",
    items: "Banco de capacitores 300kVAR 480V", costUSD: 12000, priceUSD: 18500,
    marginPercent: 35, marginUSD: 6500, status: "perdida",
    createdAt: "2025-12-20", validUntil: "2026-01-20", notes: "Cliente optó por proveedor local"
  },
];

export const mockTasks: Task[] = [
  {
    id: "t1", title: "Enviar cotización transformadores a Cliente AA", description: "Preparar y enviar la cotización formal para los 3 transformadores 500kVA.",
    status: "pendiente", priority: "alta", assignee: "Gabriel Méndez", clientId: "c4", projectId: "p1",
    dueDate: "2026-02-28", createdAt: "2026-02-20",
    comments: [{ id: "tc1", author: "Carlos Rodríguez", text: "Ya tengo los precios de Siemens actualizados", createdAt: "2026-02-21T10:30:00" }],
  },
  {
    id: "t2", title: "Seguimiento pago Cervecería Nacional", description: "Verificar estado del pago pendiente de la factura FV-2026-003.",
    status: "en_progreso", priority: "alta", assignee: "Ana Martínez", clientId: "c2",
    dueDate: "2026-02-25", createdAt: "2026-02-18",
    comments: [],
  },
  {
    id: "t3", title: "Revisar planos de ingeniería Subestación CEMEX", description: "Validar los planos eléctricos antes de enviar al cliente.",
    status: "en_progreso", priority: "media", assignee: "Luis Pérez", clientId: "c5", projectId: "p1",
    dueDate: "2026-03-01", createdAt: "2026-02-19",
    comments: [
      { id: "tc2", author: "Luis Pérez", text: "Revisando diagrama unifilar, hay una discrepancia en la protección", createdAt: "2026-02-22T14:00:00" },
      { id: "tc3", author: "Gabriel Méndez", text: "Coordina con Siemens para confirmar el relay correcto", createdAt: "2026-02-22T15:20:00" },
    ],
  },
  {
    id: "t4", title: "Coordinar entrega switchgear AES", description: "Confirmar fecha de entrega y logística del switchgear 13.8kV.",
    status: "pendiente", priority: "media", assignee: "Carlos Rodríguez", clientId: "c3", projectId: "p3",
    dueDate: "2026-03-10", createdAt: "2026-02-20",
    comments: [],
  },
  {
    id: "t5", title: "Actualizar diagrama de Gantt proyecto Grupo Rica", description: "Agregar las nuevas fechas de entrega de los variadores.",
    status: "completada", priority: "baja", assignee: "María Santos", clientId: "c4", projectId: "p4",
    dueDate: "2026-02-22", createdAt: "2026-02-15",
    comments: [{ id: "tc4", author: "María Santos", text: "Listo, actualizado con las fechas confirmadas por Siemens", createdAt: "2026-02-22T09:00:00" }],
  },
  {
    id: "t6", title: "Preparar oferta automatización línea 3 Cervecería", description: "Armar la propuesta técnica y comercial para la automatización.",
    status: "pendiente", priority: "alta", assignee: "Gabriel Méndez", clientId: "c2",
    dueDate: "2026-03-05", createdAt: "2026-02-23",
    comments: [],
  },
  {
    id: "t7", title: "Registrar factura proveedor Siemens - Motores", description: "Cargar la factura de Siemens por el motor 250HP al sistema.",
    status: "completada", priority: "media", assignee: "Ana Martínez", clientId: "c2", projectId: "p2",
    dueDate: "2026-02-20", createdAt: "2026-02-16",
    comments: [],
  },
  {
    id: "t8", title: "Llamar a CEMEX para confirmar OC", description: "Confirmar la orden de compra del proyecto de subestación.",
    status: "pendiente", priority: "media", assignee: "Gabriel Méndez", clientId: "c5", projectId: "p1",
    dueDate: "2026-02-26", createdAt: "2026-02-23",
    comments: [],
  },
];

export const mockProducts: Product[] = [
  { id: "prod1", name: "Transformadores", category: "SE" },
  { id: "prod2", name: "Motores", category: "DI" },
  { id: "prod3", name: "Switchgear", category: "SE" },
  { id: "prod4", name: "Drives", category: "DI" },
  { id: "prod5", name: "Variadores de Frecuencia", category: "DI" },
  { id: "prod6", name: "Arrancadores Suaves", category: "DI" },
  { id: "prod7", name: "Tableros de Distribución", category: "SE" },
  { id: "prod8", name: "Protección y Control", category: "SE" },
  { id: "prod9", name: "Automatización", category: "DI" },
  { id: "prod10", name: "Banco de Capacitores", category: "SE" },
];

export const mockForecast: ForecastYear = {
  year: 2026,
  annualTarget: 1200000,
  previousYearWon: 850000,
  revenueBudget: 1000000,
  previousYearRevenue: 780000,
  marginBudget: 900000,
  previousYearMargin: 703600,
  months: [
    { month: "Ene", target: 100000, actual: 115800, projected: 115800 },
    { month: "Feb", target: 100000, actual: 78500, projected: 78500 },
    { month: "Mar", target: 100000, actual: 0, projected: 95000 },
    { month: "Abr", target: 100000, actual: 0, projected: 110000 },
    { month: "May", target: 100000, actual: 0, projected: 88000 },
    { month: "Jun", target: 100000, actual: 0, projected: 125000 },
    { month: "Jul", target: 100000, actual: 0, projected: 92000 },
    { month: "Ago", target: 100000, actual: 0, projected: 105000 },
    { month: "Sep", target: 100000, actual: 0, projected: 98000 },
    { month: "Oct", target: 100000, actual: 0, projected: 115000 },
    { month: "Nov", target: 100000, actual: 0, projected: 130000 },
    { month: "Dic", target: 100000, actual: 0, projected: 85000 },
  ],
};
