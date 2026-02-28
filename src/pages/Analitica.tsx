import { useState } from "react";
import { mockProspects, mockForecast } from "@/lib/mockData";
import { DEFAULT_PIPELINE_STAGES, type Prospect, type ForecastYear, type PipelineStage } from "@/lib/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DollarSign, TrendingUp, Users, Target, BarChart3, PieChart as PieChartIcon,
  Info, Pencil,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const COLORS = ["hsl(199 89% 48%)", "hsl(168 76% 42%)", "hsl(45 93% 47%)", "hsl(142 71% 45%)", "hsl(0 84% 60%)"];

const fmt = (n: number) => `$${n.toLocaleString()}`;

// ── Order Entry bar colors matching the reference chart ──
const BAR_COLORS = {
  previousYear: "#38bdf8",  // sky-400
  current: "#06b6d4",       // cyan-500
  forecast: "#0ea5e9",      // sky-500
  budget: "#6d28d9",        // violet-700
};

// ── Order Entry bar descriptions ──
const BAR_INFO: Record<string, { label: string; description: string }> = {
  previousYear: {
    label: "Año anterior",
    description: "Total de oportunidades ganadas (status 'ganado') del año anterior. Representa el Order Entry cerrado del período previo.",
  },
  current: {
    label: "Current",
    description: "Total de oportunidades ganadas en el año en curso. Se calcula sumando el priceUSD de todas las oportunidades con status 'ganado'.",
  },
  forecast: {
    label: "Forecast",
    description: "Suma del peso (weighted = priceUSD × probabilidad) de todas las oportunidades abiertas (no ganadas ni perdidas). Representa el valor esperado del pipeline.",
  },
  budget: {
    label: "Budget",
    description: "Meta anual estipulada para el año. Es el objetivo de ventas definido por la gerencia.",
  },
};

/** Custom tooltip for the Order Entry chart */
const OrderEntryTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 max-w-[260px]">
      <p className="font-semibold text-sm mb-1">{item.label}</p>
      <p className="text-lg font-bold text-primary">{fmt(item.value)}</p>
      <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{item.description}</p>
      {item.details && item.details.length > 0 && (
        <div className="mt-2 border-t pt-2 space-y-1">
          {item.details.map((d: { name: string; amount: number }, i: number) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground truncate mr-2">{d.name}</span>
              <span className="font-medium shrink-0">{fmt(d.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Custom bar label showing value on top */
const BarTopLabel = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">
      {fmt(value)}
    </text>
  );
};

const Analitica = () => {
  const { toast } = useToast();
  const [prospects] = useLocalStorage<Prospect[]>("sinem:crm:prospects", mockProspects);
  const [forecast, setForecast] = useLocalStorage<ForecastYear>("sinem:forecast", mockForecast, (cached) => {
    if (cached.previousYearWon === undefined) return { ...cached, previousYearWon: mockForecast.previousYearWon };
    return cached;
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editAnnual, setEditAnnual] = useState(0);
  const [editPrevYear, setEditPrevYear] = useState(0);

  const currentYear = forecast.year;
  const previousYear = currentYear - 1;

  // ── Order Entry data ──
  const wonDeals = prospects.filter((p) => p.status === "ganado");
  const wonTotal = wonDeals.reduce((s, p) => s + p.priceUSD, 0);
  const openProspects = prospects.filter((p) => !["ganado", "perdido"].includes(p.status));
  const forecastWeighted = openProspects.reduce((s, p) => s + p.weighted, 0);

  const orderEntryData = [
    {
      name: `${previousYear}`,
      label: `${previousYear}`,
      value: forecast.previousYearWon,
      fill: BAR_COLORS.previousYear,
      description: BAR_INFO.previousYear.description,
      details: [],
    },
    {
      name: "Current",
      label: "Current",
      value: wonTotal,
      fill: BAR_COLORS.current,
      description: BAR_INFO.current.description,
      details: wonDeals.map((p) => ({ name: p.projectName, amount: p.priceUSD })),
    },
    {
      name: "Forecast",
      label: "Forecast",
      value: forecastWeighted,
      fill: BAR_COLORS.forecast,
      description: BAR_INFO.forecast.description,
      details: openProspects
        .sort((a, b) => b.weighted - a.weighted)
        .slice(0, 6)
        .map((p) => ({ name: `${p.projectName} (${p.probability}%)`, amount: p.weighted })),
    },
    {
      name: `Budget ${currentYear}`,
      label: `Budget ${currentYear}`,
      value: forecast.annualTarget,
      fill: BAR_COLORS.budget,
      description: BAR_INFO.budget.description,
      details: [],
    },
  ];

  const maxBarValue = Math.max(...orderEntryData.map((d) => d.value));

  // ── Pipeline KPIs ──
  const totalPipeline = prospects.reduce((s, p) => s + p.priceUSD, 0);
  const totalWeighted = prospects.reduce((s, p) => s + p.weighted, 0);
  const totalMargin = prospects.reduce((s, p) => s + p.marginUSD, 0);
  const avgMarginPct = prospects.length > 0 ? Math.round(prospects.reduce((s, p) => s + p.marginPercent, 0) / prospects.length) : 0;
  const winRate = prospects.length > 0
    ? Math.round((wonDeals.length / prospects.filter((p) => p.status !== "prospecto").length) * 100)
    : 0;

  // Pipeline by stage
  const [stages] = useLocalStorage<PipelineStage[]>("sinem:pipeline:stages", DEFAULT_PIPELINE_STAGES);

  const stageData = stages.map((stage) => {
    const sp = prospects.filter((p) => p.status === stage.key);
    return { name: stage.label, count: sp.length, value: sp.reduce((s, p) => s + p.priceUSD, 0), weighted: sp.reduce((s, p) => s + p.weighted, 0) };
  });

  // Pipeline by product
  const productMap = new Map<string, { count: number; value: number }>();
  prospects.forEach((p) => {
    const e = productMap.get(p.product) || { count: 0, value: 0 };
    productMap.set(p.product, { count: e.count + 1, value: e.value + p.priceUSD });
  });
  const productData = Array.from(productMap.entries())
    .map(([product, d]) => ({ name: product, value: d.value, count: d.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

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

  // Top clients
  const clientPipeline = new Map<string, number>();
  prospects.forEach((p) => clientPipeline.set(p.directCustomer, (clientPipeline.get(p.directCustomer) || 0) + p.priceUSD));
  const topClients = Array.from(clientPipeline.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // ── Budget edit ──
  const openEdit = () => {
    setEditAnnual(forecast.annualTarget);
    setEditPrevYear(forecast.previousYearWon);
    setEditOpen(true);
  };
  const handleSave = () => {
    setForecast({ ...forecast, annualTarget: editAnnual, previousYearWon: editPrevYear });
    setEditOpen(false);
    toast({ title: "Budget actualizado" });
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analítica</h1>
          <p className="text-muted-foreground text-sm mt-1">Order Entry, pipeline y rendimiento comercial</p>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Pencil className="h-4 w-4 mr-1" /> Editar Budget / Metas
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════
          ORDER ENTRY CHART — Hero section
          ══════════════════════════════════════════════════════ */}
      <div className="stat-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-bold">Order Entry</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[340px] p-3 space-y-2 text-xs leading-relaxed">
              <p className="font-semibold text-sm mb-1">¿Qué muestra esta gráfica?</p>
              <div><strong className="text-sky-400">{previousYear}:</strong> {BAR_INFO.previousYear.description}</div>
              <div><strong className="text-cyan-500">Current:</strong> {BAR_INFO.current.description}</div>
              <div><strong className="text-sky-500">Forecast:</strong> {BAR_INFO.forecast.description}</div>
              <div><strong className="text-violet-600">Budget {currentYear}:</strong> {BAR_INFO.budget.description}</div>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground mb-5">Datos en USD$</p>

        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={orderEntryData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.ceil(maxBarValue * 1.15 / 100000) * 100000]}
            />
            <RechartsTooltip content={<OrderEntryTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} label={<BarTopLabel />}>
              {orderEntryData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={DollarSign} label="Pipeline Total" value={fmt(totalPipeline)} sub={`${prospects.length} oportunidades`} color="bg-primary" />
        <KpiCard icon={TrendingUp} label="Ponderado" value={fmt(totalWeighted)} color="bg-sinem-info" />
        <KpiCard icon={Target} label="Ganados" value={fmt(wonTotal)} sub={`Win rate: ${winRate}%`} color="bg-sinem-success" />
        <KpiCard icon={BarChart3} label="Margen Total" value={fmt(totalMargin)} sub={`Promedio: ${avgMarginPct}%`} color="bg-sinem-teal" />
        <KpiCard icon={Target} label={`Budget ${currentYear}`} value={fmt(forecast.annualTarget)} sub={`${previousYear}: ${fmt(forecast.previousYearWon)}`} color="bg-violet-600" />
      </div>

      {/* Row 1: Pipeline by Stage + By Product */}
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
              <RechartsTooltip
                formatter={(value: number, name: string) => [fmt(value), name]}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Bar dataKey="value" name="Valor" fill="hsl(199 89% 48%)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="weighted" name="Ponderado" fill="hsl(168 76% 42%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

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
              <RechartsTooltip
                formatter={(value: number) => [fmt(value), "Valor"]}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Probability Radar + Top Clients */}
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
              <RechartsTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
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
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(1)}% del pipeline</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          EDIT BUDGET / METAS DIALOG
          ══════════════════════════════════════════════════════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Budget y Metas {currentYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget Anual (Meta {currentYear})</Label>
                <Input type="number" value={editAnnual} onChange={(e) => setEditAnnual(Number(e.target.value))} />
              </div>
              <div>
                <Label>Order Entry {previousYear} (Año Anterior)</Label>
                <Input type="number" value={editPrevYear} onChange={(e) => setEditPrevYear(Number(e.target.value))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analitica;
