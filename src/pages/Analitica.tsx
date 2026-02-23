import { mockProspects, mockClients, mockProjects, mockForecast } from "@/lib/mockData";
import { PIPELINE_STAGES, type Prospect, type ForecastYear } from "@/lib/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  DollarSign, TrendingUp, Users, FolderKanban, Target, BarChart3, PieChart as PieChartIcon, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

const COLORS = ["hsl(199 89% 48%)", "hsl(168 76% 42%)", "hsl(45 93% 47%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)"];

const fmt = (n: number) => `$${n.toLocaleString()}`;

const Analitica = () => {
  const [prospects] = useLocalStorage<Prospect[]>("sinem:crm:prospects", mockProspects);
  const [forecast] = useLocalStorage<ForecastYear>("sinem:forecast", mockForecast);

  // Pipeline KPIs
  const totalPipeline = prospects.reduce((s, p) => s + p.priceUSD, 0);
  const totalWeighted = prospects.reduce((s, p) => s + p.weighted, 0);
  const totalMargin = prospects.reduce((s, p) => s + p.marginUSD, 0);
  const avgMarginPct = prospects.length > 0 ? Math.round(prospects.reduce((s, p) => s + p.marginPercent, 0) / prospects.length) : 0;
  const wonDeals = prospects.filter((p) => p.status === "ganado");
  const wonTotal = wonDeals.reduce((s, p) => s + p.priceUSD, 0);
  const winRate = prospects.length > 0 ? Math.round((wonDeals.length / prospects.filter((p) => p.status !== "prospecto").length) * 100) : 0;

  // Pipeline by stage
  const stageData = PIPELINE_STAGES.map((stage) => {
    const stageProspects = prospects.filter((p) => p.status === stage.key);
    return {
      name: stage.label,
      count: stageProspects.length,
      value: stageProspects.reduce((s, p) => s + p.priceUSD, 0),
      weighted: stageProspects.reduce((s, p) => s + p.weighted, 0),
    };
  });

  // Pipeline by BU
  const buMap = new Map<string, { count: number; value: number }>();
  prospects.forEach((p) => {
    const existing = buMap.get(p.bu) || { count: 0, value: 0 };
    buMap.set(p.bu, { count: existing.count + 1, value: existing.value + p.priceUSD });
  });
  const buData = Array.from(buMap.entries()).map(([bu, data]) => ({ name: bu, value: data.value, count: data.count }));

  // Pipeline by product
  const productMap = new Map<string, { count: number; value: number }>();
  prospects.forEach((p) => {
    const existing = productMap.get(p.product) || { count: 0, value: 0 };
    productMap.set(p.product, { count: existing.count + 1, value: existing.value + p.priceUSD });
  });
  const productData = Array.from(productMap.entries())
    .map(([product, data]) => ({ name: product, value: data.value, count: data.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Forecast vs Actual
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  let cumActual = 0, cumTarget = 0, cumProjected = 0;
  const forecastChart = forecast.months.map((m, i) => {
    cumTarget += m.target;
    cumActual += m.actual;
    cumProjected += m.projected;
    const isPast = i < currentMonthIdx;
    const isCurrent = i === currentMonthIdx;
    return {
      month: m.month,
      meta: m.target,
      real: isPast || isCurrent ? m.actual : null,
      proyectado: m.projected,
      cumMeta: cumTarget,
      cumReal: isPast || isCurrent ? cumActual : null,
      cumProyectado: cumProjected,
    };
  });

  const totalActual = forecast.months.reduce((s, m) => s + m.actual, 0);
  const totalTarget = forecast.months.reduce((s, m) => s + m.target, 0);
  const totalProjected = forecast.months.reduce((s, m) => s + m.projected, 0);
  const achievementPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

  // Probability distribution (radar)
  const probRanges = [
    { range: "0-20%", min: 0, max: 20 },
    { range: "21-40%", min: 21, max: 40 },
    { range: "41-60%", min: 41, max: 60 },
    { range: "61-80%", min: 61, max: 80 },
    { range: "81-100%", min: 81, max: 100 },
  ];
  const radarData = probRanges.map((r) => {
    const matching = prospects.filter((p) => p.probability >= r.min && p.probability <= r.max);
    return { subject: r.range, count: matching.length, value: matching.reduce((s, p) => s + p.priceUSD, 0) / 1000 };
  });

  // Top clients by pipeline
  const clientPipeline = new Map<string, number>();
  prospects.forEach((p) => {
    const key = p.directCustomer;
    clientPipeline.set(key, (clientPipeline.get(key) || 0) + p.priceUSD);
  });
  const topClients = Array.from(clientPipeline.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const KpiCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) => (
    <div className="stat-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analítica</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumen ejecutivo del pipeline, forecast y rendimiento comercial</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard icon={DollarSign} label="Pipeline Total" value={fmt(totalPipeline)} sub={`${prospects.length} oportunidades`} color="bg-primary" />
        <KpiCard icon={TrendingUp} label="Ponderado" value={fmt(totalWeighted)} color="bg-sinem-info" />
        <KpiCard icon={Target} label="Ganados" value={fmt(wonTotal)} sub={`Win rate: ${winRate}%`} color="bg-sinem-success" />
        <KpiCard icon={BarChart3} label="Margen Total" value={fmt(totalMargin)} sub={`Promedio: ${avgMarginPct}%`} color="bg-sinem-teal" />
        <KpiCard icon={Activity} label="Forecast YTD" value={fmt(totalActual)} sub={`${achievementPct}% de meta`} color="bg-sinem-warning" />
        <KpiCard icon={FolderKanban} label="Proyectado Anual" value={fmt(totalProjected)} sub={`Meta: ${fmt(totalTarget)}`} color="bg-primary" />
      </div>

      {/* Row 1: Pipeline by Stage + Forecast Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="stat-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" /> Pipeline por Etapa
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stageData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
              <Tooltip
                formatter={(value: number, name: string) => [fmt(value), name === "value" ? "Valor" : "Ponderado"]}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Bar dataKey="value" name="Valor" fill="hsl(199 89% 48%)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="weighted" name="Ponderado" fill="hsl(168 76% 42%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" /> Forecast Acumulado {forecast.year}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={forecastChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => [fmt(value), name]}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Legend />
              <Area type="monotone" dataKey="cumMeta" name="Meta Acum." fill="hsl(var(--muted-foreground))" fillOpacity={0.06} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="cumReal" name="Real Acum." stroke="hsl(142 71% 45%)" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="cumProyectado" name="Proyectado" stroke="hsl(199 89% 48%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: By Product + By BU */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="stat-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-muted-foreground" /> Pipeline por Producto
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={productData}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ strokeWidth: 1 }}
              >
                {productData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [fmt(value), "Valor"]}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" /> Pipeline por Unidad de Negocio
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={buData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number, name: string) => [name === "value" ? fmt(value) : value, name === "value" ? "Valor" : "Cantidad"]}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Bar dataKey="value" name="Valor" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Probability Radar + Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="stat-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" /> Distribución por Probabilidad
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Radar name="Oportunidades" dataKey="count" stroke="hsl(199 89% 48%)" fill="hsl(199 89% 48%)" fillOpacity={0.3} />
              <Radar name="Valor ($k)" dataKey="value" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45%)" fillOpacity={0.2} />
              <Legend />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" /> Top Clientes por Pipeline
          </h3>
          <div className="space-y-3">
            {topClients.map((client, i) => {
              const pct = totalPipeline > 0 ? (client.value / totalPipeline) * 100 : 0;
              return (
                <div key={client.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{client.name}</span>
                    <span className="text-sm font-semibold">{fmt(client.value)}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(1)}% del pipeline</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Forecast Table */}
      <div className="stat-card p-5">
        <h3 className="text-sm font-semibold mb-4">Forecast Mensual vs Real</h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={forecastChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number, name: string) => [fmt(value), name]}
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
            />
            <Legend />
            <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted-foreground))" opacity={0.2} radius={[4, 4, 0, 0]} />
            <Bar dataKey="real" name="Real" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="proyectado" name="Proyectado" stroke="hsl(199 89% 48%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analitica;
