import { DollarSign, Users, FolderKanban, TrendingUp, ArrowUpRight, ArrowDownRight, Building2, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Prospectos", value: "8", change: "+8%", up: true, icon: Users },
  { label: "Cotizaciones", value: "7", change: "+12%", up: true, icon: FileText },
  { label: "Clientes", value: "5", change: "+2", up: true, icon: Building2 },
  { label: "Proyectos en Curso", value: "3", change: "+1", up: true, icon: FolderKanban },
  { label: "Revenue Pipeline", value: "$610K", change: "+15%", up: true, icon: TrendingUp },
];

const recentDeals = [
  { name: "Transformadores ABB", client: "CEMEX RD", value: "$45,000", status: "Ganado", statusColor: "bg-sinem-success" },
  { name: "Motor Siemens 250HP", client: "Cervecería Nacional", value: "$28,500", status: "En Negociación", statusColor: "bg-sinem-warning" },
  { name: "Switchgear 13.8kV", client: "AES Dominicana", value: "$120,000", status: "Propuesta", statusColor: "bg-sinem-info" },
  { name: "Variadores de Frecuencia", client: "Grupo Rica", value: "$15,800", status: "Ganado", statusColor: "bg-sinem-success" },
  { name: "PLC Simatic S7-1500", client: "Barrick Gold", value: "$32,000", status: "Perdido", statusColor: "bg-destructive" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumen general de operaciones SINEM</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${stat.up ? 'text-sinem-success' : 'text-destructive'}`}>
                {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Cotizaciones Recientes</h2>
            <Link to="/cotizaciones" className="text-xs text-primary hover:underline">Ver todo →</Link>
          </div>
          <div className="space-y-3">
            {recentDeals.map((deal, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div>
                  <p className="text-sm font-medium">{deal.name}</p>
                  <p className="text-xs text-muted-foreground">{deal.client}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="text-sm font-semibold">{deal.value}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full text-primary-foreground ${deal.statusColor}`}>
                    {deal.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Proyectos Activos</h2>
            <Link to="/projects" className="text-xs text-primary hover:underline">Ver todo →</Link>
          </div>
          <div className="space-y-3">
            {[
              { name: "Subestación Eléctrica CEMEX", step: 5, total: 11, client: "CEMEX RD" },
              { name: "Automatización Línea 3", step: 3, total: 11, client: "Cervecería Nacional" },
              { name: "Switchgear AES", step: 8, total: 11, client: "AES Dominicana" },
              { name: "Drives Grupo Rica", step: 2, total: 11, client: "Grupo Rica" },
            ].map((proj, i) => (
              <div key={i} className="py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium">{proj.name}</p>
                  <span className="text-xs text-muted-foreground">{proj.client}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(proj.step / proj.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    Paso {proj.step}/{proj.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Clientes Principales</h2>
            <Link to="/clientes" className="text-xs text-primary hover:underline">Ver todo →</Link>
          </div>
          <div className="space-y-3">
            {[
              { name: "CEMEX RD", industry: "Construcción", revenue: "$245,000", offers: 2 },
              { name: "Grupo Rica", industry: "Alimentos y Bebidas", revenue: "$15,800", offers: 2 },
              { name: "Cervecería Nacional", industry: "Manufactura", revenue: "$28,500", offers: 1 },
              { name: "AES Dominicana", industry: "Energía", revenue: "$120,000", offers: 1 },
            ].map((client, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.industry}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{client.revenue}</p>
                  <p className="text-[10px] text-muted-foreground">{client.offers} ofertas activas</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
