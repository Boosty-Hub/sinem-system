import { useEffect, useState } from "react";
import { Users, FolderKanban, TrendingUp, ArrowUpRight, Building2, FileText, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface DashboardData {
  prospectsCount: number;
  quotationsCount: number;
  clientsCount: number;
  activeProjectsCount: number;
  activeOpportunitiesCount: number;
  pipelineValue: number;
  recentQuotations: { id: string; subject: string; client_company: string; total_usd: number; status: string }[];
  activeProjects: { id: string; name: string; client: string; current_step: number; status: string }[];
  topClients: { id: string; name: string; industry: string; total_revenue: number; total_projects: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground",
  enviada: "bg-sinem-info text-primary-foreground",
  aprobada: "bg-sinem-success text-primary-foreground",
  rechazada: "bg-destructive text-primary-foreground",
  ganada: "bg-sinem-success text-primary-foreground",
  perdida: "bg-destructive text-primary-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  ganada: "Ganada",
  perdida: "Perdida",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    prospectsCount: 0,
    quotationsCount: 0,
    clientsCount: 0,
    activeProjectsCount: 0,
    activeOpportunitiesCount: 0,
    pipelineValue: 0,
    recentQuotations: [],
    activeProjects: [],
    topClients: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [
        { count: prospectsCount },
        { data: quotations },
        { data: clients },
        { data: projects },
        { count: activeOpportunitiesCount },
      ] = await Promise.all([
        supabase.from("prospects").select("*", { count: "exact", head: true }),
        supabase.from("quotations").select("id, subject, client_company, total_usd, status, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("clients").select("id, name, industry, total_revenue, total_projects").order("total_revenue", { ascending: false }).limit(5),
        supabase.from("projects").select("id, name, client, current_step, status, value"),
        supabase.from("prospects").select("*", { count: "exact", head: true }).in("status", ["prospecto", "propuesta", "seguimiento"]),
      ]);

      const activeProjects = (projects ?? []).filter((p) => p.status === "activo");
      const pipelineValue = (quotations ?? []).reduce((sum, q) => sum + (q.total_usd || 0), 0);

      // Get total quotations count
      const { count: quotationsCount } = await supabase.from("quotations").select("*", { count: "exact", head: true });

      // Get total clients count
      const { count: clientsCount } = await supabase.from("clients").select("*", { count: "exact", head: true });

      setData({
        prospectsCount: prospectsCount ?? 0,
        quotationsCount: quotationsCount ?? 0,
        clientsCount: clientsCount ?? 0,
        activeProjectsCount: activeProjects.length,
        activeOpportunitiesCount: activeOpportunitiesCount ?? 0,
        pipelineValue,
        recentQuotations: quotations ?? [],
        activeProjects: activeProjects.slice(0, 4),
        topClients: clients ?? [],
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  const stats = [
    { label: "Prospectos", value: data.prospectsCount.toString(), icon: Users, to: "/crm" },
    { label: "Cotizaciones", value: data.quotationsCount.toString(), icon: FileText, to: "/cotizaciones" },
    { label: "Clientes", value: data.clientsCount.toString(), icon: Building2, to: "/clientes" },
    { label: "Proyectos Activos", value: data.activeProjectsCount.toString(), icon: FolderKanban, to: "/projects" },
    { label: "Oportunidades Activas", value: data.activeOpportunitiesCount.toString(), icon: TrendingUp, to: "/crm" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumen general de operaciones SINEM</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="stat-card cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
            onClick={() => navigate(stat.to)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
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
            {data.recentQuotations.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay cotizaciones</p>
            )}
            {data.recentQuotations.map((q) => (
              <div key={q.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-medium truncate">{q.subject || "Sin asunto"}</p>
                  <p className="text-xs text-muted-foreground">{q.client_company || "—"}</p>
                </div>
                <div className="text-right flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold">${(q.total_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[q.status] ?? "bg-muted text-muted-foreground"}`}>
                    {STATUS_LABELS[q.status] ?? q.status}
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
            {data.activeProjects.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay proyectos activos</p>
            )}
            {data.activeProjects.map((proj) => (
              <Link to={`/projects/${proj.id}`} key={proj.id} className="block py-2 border-b border-border/40 last:border-0 hover:bg-muted/30 rounded px-1 -mx-1 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium">{proj.name}</p>
                  <span className="text-xs text-muted-foreground">{proj.client}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(proj.current_step / 11) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    Paso {proj.current_step}/11
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Clientes Principales</h2>
            <Link to="/clientes" className="text-xs text-primary hover:underline">Ver todo →</Link>
          </div>
          <div className="space-y-3">
            {data.topClients.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay clientes</p>
            )}
            {data.topClients.map((client) => (
              <Link to={`/clientes/${client.id}`} key={client.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 hover:bg-muted/30 rounded px-1 -mx-1 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.industry || "—"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${(client.total_revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-muted-foreground">{client.total_projects} proyectos</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
