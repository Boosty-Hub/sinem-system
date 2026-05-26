import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Prospect } from "@/lib/types";
import { dbToProspect } from "@/lib/supabaseMappers";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, TrendingUp, TrendingDown, DollarSign, Pencil, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

interface ForecastMonth {
  id?: string;
  month: string;
  target: number;
  actual: number;
  projected: number;
}

const Forecast = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [forecastYearId, setForecastYearId] = useState<string | null>(null);
  const [annualTarget, setAnnualTarget] = useState(0);
  const [months, setMonths] = useState<ForecastMonth[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());

  const [editOpen, setEditOpen] = useState(false);
  const [editMonths, setEditMonths] = useState<ForecastMonth[]>([]);
  const [editAnnual, setEditAnnual] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      setYear(currentYear);

      const [{ data: prospectsData }, { data: fyData }] = await Promise.all([
        supabase.from("prospects").select("*").is("deleted_at", null),
        supabase.from("forecast_years").select("*").eq("year", currentYear).maybeSingle(),
      ]);

      setProspects((prospectsData ?? []).map(dbToProspect));

      if (fyData) {
        setForecastYearId(fyData.id);
        setAnnualTarget(Number(fyData.annual_target));

        const { data: monthsData } = await supabase
          .from("forecast_months")
          .select("*")
          .eq("forecast_year_id", fyData.id);

        if (monthsData && monthsData.length > 0) {
          const mapped = MONTH_NAMES.map((m) => {
            const found = monthsData.find((md) => md.month === m);
            return {
              id: found?.id,
              month: m,
              target: Number(found?.target ?? 0),
              actual: Number(found?.actual ?? 0),
              projected: Number(found?.projected ?? 0),
            };
          });
          setMonths(mapped);
        } else {
          setMonths(MONTH_NAMES.map((m) => ({ month: m, target: 0, actual: 0, projected: 0 })));
        }
      } else {
        setMonths(MONTH_NAMES.map((m) => ({ month: m, target: 0, actual: 0, projected: 0 })));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const now = new Date();
  const currentMonthIdx = now.getMonth();

  const pipelineTotal = prospects
    .filter((p) => p.status !== "perdido")
    .reduce((sum, p) => sum + p.weighted, 0);

  const totalActual = months.reduce((s, m) => s + m.actual, 0);
  const totalProjected = months.reduce((s, m) => s + m.projected, 0);
  const totalTarget = months.reduce((s, m) => s + m.target, 0);
  const remainingTarget = totalTarget - totalActual;
  const achievementPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  const projectedAchievement = totalTarget > 0 ? Math.round((totalProjected / totalTarget) * 100) : 0;

  let cumActual = 0, cumTarget = 0, cumProjected = 0;
  const chartData = months.map((m, i) => {
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

  const openEdit = () => {
    setEditMonths(months.map((m) => ({ ...m })));
    setEditAnnual(annualTarget);
    setEditOpen(true);
  };

  const distributeTarget = () => {
    const perMonth = Math.round(editAnnual / 12);
    setEditMonths((prev) => prev.map((m) => ({ ...m, target: perMonth })));
  };

  const handleSave = async () => {
    let fyId = forecastYearId;

    if (!fyId) {
      const { data } = await supabase.from("forecast_years")
        .insert({ year, annual_target: editAnnual })
        .select().single();
      if (!data) return;
      fyId = data.id;
      setForecastYearId(fyId);
    } else {
      await supabase.from("forecast_years").update({ annual_target: editAnnual }).eq("id", fyId);
    }

    // Upsert months
    for (const m of editMonths) {
      if (m.id) {
        await supabase.from("forecast_months").update({
          target: m.target, actual: m.actual, projected: m.projected,
        }).eq("id", m.id);
      } else {
        const { data } = await supabase.from("forecast_months").insert({
          forecast_year_id: fyId!, month: m.month,
          target: m.target, actual: m.actual, projected: m.projected,
        }).select().single();
        if (data) m.id = data.id;
      }
    }

    setAnnualTarget(editAnnual);
    setMonths(editMonths.map((m) => ({ ...m })));
    setEditOpen(false);
    toast({ title: "Forecast actualizado" });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecast {year}</h1>
          <p className="text-muted-foreground text-sm mt-1">Proyecciones de ventas y metas mensuales</p>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Pencil className="h-4 w-4 mr-1" /> Editar Metas
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={Target} label="Meta Anual" value={fmt(totalTarget)} color="bg-primary" />
        <KpiCard icon={DollarSign} label="Ventas Reales" value={fmt(totalActual)} sub={`${achievementPct}% de la meta`} color="bg-sinem-success" />
        <KpiCard icon={TrendingUp} label="Proyectado" value={fmt(totalProjected)} sub={`${projectedAchievement}% de la meta`} color="bg-sinem-info" />
        <KpiCard icon={AlertTriangle} label="Restante" value={fmt(Math.max(0, remainingTarget))} sub="para alcanzar meta" color="bg-sinem-warning" />
        <KpiCard icon={CheckCircle2} label="Pipeline Ponderado" value={fmt(pipelineTotal)} sub="oportunidades activas" color="bg-sinem-teal" />
      </div>

      {/* Monthly Chart */}
      <div className="stat-card p-5">
        <h3 className="text-sm font-semibold mb-4">Ventas Mensuales vs Meta</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number, name: string) => [fmt(value), name === "meta" ? "Meta" : name === "real" ? "Real" : "Proyectado"]}
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
            />
            <Legend />
            <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted-foreground))" opacity={0.2} radius={[4, 4, 0, 0]} />
            <Bar dataKey="real" name="Real" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="proyectado" name="Proyectado" stroke="hsl(199 89% 48%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Chart */}
      <div className="stat-card p-5">
        <h3 className="text-sm font-semibold mb-4">Curva Acumulada</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number, name: string) => [fmt(value), name]}
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
            />
            <Legend />
            <Area type="monotone" dataKey="cumMeta" name="Meta Acum." fill="hsl(var(--muted-foreground))" fillOpacity={0.08} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="cumReal" name="Real Acum." stroke="hsl(142 71% 45%)" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="cumProyectado" name="Proyectado Acum." stroke="hsl(199 89% 48%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            <ReferenceLine y={totalTarget} stroke="hsl(var(--destructive))" strokeDasharray="8 4" label={{ value: "Meta Anual", position: "right", fontSize: 11 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Table */}
      <div className="stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Mes</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Meta</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Real</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Proyectado</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Diferencia</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">%</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m, i) => {
              const isPast = i < currentMonthIdx;
              const isCurrent = i === currentMonthIdx;
              const value = isPast || isCurrent ? m.actual : m.projected;
              const diff = value - m.target;
              const pct = m.target > 0 ? Math.round((value / m.target) * 100) : 0;
              return (
                <tr key={m.month} className={`border-b border-border/30 ${isCurrent ? "bg-primary/5" : ""}`}>
                  <td className="py-2.5 px-4 font-medium">
                    {m.month} {isCurrent && <span className="text-[10px] text-primary ml-1">actual</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">{fmt(m.target)}</td>
                  <td className="py-2.5 px-4 text-right">{isPast || isCurrent ? fmt(m.actual) : "—"}</td>
                  <td className="py-2.5 px-4 text-right text-sinem-info">{!isPast ? fmt(m.projected) : "—"}</td>
                  <td className={`py-2.5 px-4 text-right font-medium ${diff >= 0 ? "text-sinem-success" : "text-destructive"}`}>
                    {diff >= 0 ? "+" : ""}{fmt(diff)}
                  </td>
                  <td className={`py-2.5 px-4 text-right text-xs ${pct >= 100 ? "text-sinem-success" : pct >= 80 ? "text-sinem-warning" : "text-destructive"}`}>
                    {pct}%
                  </td>
                </tr>
              );
            })}
            <tr className="font-semibold bg-muted/30">
              <td className="py-3 px-4">Total</td>
              <td className="py-3 px-4 text-right">{fmt(totalTarget)}</td>
              <td className="py-3 px-4 text-right">{fmt(totalActual)}</td>
              <td className="py-3 px-4 text-right text-sinem-info">{fmt(totalProjected)}</td>
              <td className={`py-3 px-4 text-right ${totalProjected - totalTarget >= 0 ? "text-sinem-success" : "text-destructive"}`}>
                {totalProjected - totalTarget >= 0 ? "+" : ""}{fmt(totalProjected - totalTarget)}
              </td>
              <td className="py-3 px-4 text-right text-xs">{projectedAchievement}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Metas {year}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label>Meta Anual Total</Label>
                <Input type="number" value={editAnnual} onChange={(e) => setEditAnnual(Number(e.target.value))} />
              </div>
              <Button variant="outline" size="sm" onClick={distributeTarget}>
                Distribuir equitativamente
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Mes</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Meta</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Real</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Proyectado</th>
                  </tr>
                </thead>
                <tbody>
                  {editMonths.map((m, i) => (
                    <tr key={m.month} className="border-b border-border/30">
                      <td className="py-2 px-3 font-medium">{m.month}</td>
                      <td className="py-1 px-3">
                        <Input type="number" className="h-8 w-28" value={m.target}
                          onChange={(e) => setEditMonths((prev) => prev.map((p, j) => j === i ? { ...p, target: Number(e.target.value) } : p))} />
                      </td>
                      <td className="py-1 px-3">
                        <Input type="number" className="h-8 w-28" value={m.actual}
                          onChange={(e) => setEditMonths((prev) => prev.map((p, j) => j === i ? { ...p, actual: Number(e.target.value) } : p))} />
                      </td>
                      <td className="py-1 px-3">
                        <Input type="number" className="h-8 w-28" value={m.projected}
                          onChange={(e) => setEditMonths((prev) => prev.map((p, j) => j === i ? { ...p, projected: Number(e.target.value) } : p))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Forecast</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Forecast;
