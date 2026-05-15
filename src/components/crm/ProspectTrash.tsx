import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, AlertTriangle, Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface TrashedProspect {
  id: string;
  cotorta: number;
  project_name: string;
  status: string;
  direct_customer: string;
  end_customer: string;
  price_usd: number;
  bu: string;
  product: string;
  deleted_at: string;
  deleted_by: string | null;
  deleted_by_name: string;
  days_remaining: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUserId: string | undefined;
  onRecovered: () => void;
}

const TRASH_DAYS = 30;

const STATUS_LABELS: Record<string, string> = {
  prospecto: "Prospecto",
  seguimiento: "Seguimiento",
  propuesta: "Propuesta",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
  facturada: "Facturada",
};

export default function ProspectTrash({ open, onOpenChange, authUserId, onRecovered }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TrashedProspect[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<TrashedProspect | null>(null);
  const [confirmRecover, setConfirmRecover] = useState<TrashedProspect | null>(null);

  const fetchTrash = useCallback(async () => {
    setLoading(true);

    // Permanently delete anything older than 30 days
    const cutoff = new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("prospects").delete().not("deleted_at", "is", null).lt("deleted_at", cutoff);

    // Fetch remaining trash
    const { data } = await supabase
      .from("prospects")
      .select("id, cotorta, project_name, status, direct_customer, end_customer, price_usd, bu, product, deleted_at, deleted_by")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (!data || data.length === 0) { setItems([]); setLoading(false); return; }

    // Resolve names for deleted_by (auth.users.id → app_users.name)
    const deletedByIds = [...new Set(data.map((r: any) => r.deleted_by).filter(Boolean))];
    let nameMap: Record<string, string> = {};
    if (deletedByIds.length > 0) {
      const { data: users } = await supabase
        .from("app_users")
        .select("auth_user_id, name")
        .in("auth_user_id", deletedByIds);
      (users ?? []).forEach((u: any) => { nameMap[u.auth_user_id] = u.name; });
    }

    const now = Date.now();
    setItems(
      data.map((r: any) => {
        const deletedMs = new Date(r.deleted_at).getTime();
        const daysElapsed = Math.floor((now - deletedMs) / (1000 * 60 * 60 * 24));
        return {
          ...r,
          deleted_by_name: r.deleted_by ? (nameMap[r.deleted_by] ?? "Usuario desconocido") : "Sistema",
          days_remaining: Math.max(0, TRASH_DAYS - daysElapsed),
        };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => { if (open) fetchTrash(); }, [open, fetchTrash]);

  const handleRecover = async (item: TrashedProspect) => {
    const { error } = await supabase
      .from("prospects")
      .update({
        deleted_at: null,
        deleted_by: null,
        recovered_at: new Date().toISOString(),
        recovered_by: authUserId ?? null,
      })
      .eq("id", item.id);

    if (error) {
      toast({ title: "Error al recuperar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Oportunidad recuperada", description: `"${item.project_name}" volvió al pipeline.` });
    setConfirmRecover(null);
    fetchTrash();
    onRecovered();
  };

  const handlePermanentDelete = async (item: TrashedProspect) => {
    await supabase.from("prospects").delete().eq("id", item.id);
    toast({ title: "Eliminada permanentemente", description: `"${item.project_name}" fue eliminada.` });
    setConfirmDelete(null);
    fetchTrash();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Papelera de Oportunidades
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Las oportunidades se eliminan permanentemente después de {TRASH_DAYS} días.
            </p>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
              <Trash2 className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">La papelera está vacía</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.cotorta > 0 && (
                          <span className="text-xs font-mono text-muted-foreground">#{item.cotorta}</span>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {STATUS_LABELS[item.status] ?? item.status}
                        </Badge>
                        {item.bu && <Badge variant="secondary" className="text-[10px]">{item.bu}</Badge>}
                      </div>
                      <p className="text-sm font-semibold mt-1 truncate">{item.project_name}</p>
                      {(item.direct_customer || item.end_customer) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.direct_customer || item.end_customer}
                        </p>
                      )}
                      {item.price_usd > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ${item.price_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30"
                        onClick={() => setConfirmRecover(item)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Recuperar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDelete(item)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t text-[10px] text-muted-foreground flex-wrap">
                    <span>Eliminado por <strong>{item.deleted_by_name}</strong></span>
                    <span>·</span>
                    <span>{new Date(item.deleted_at).toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    <span>·</span>
                    <span className={`flex items-center gap-0.5 font-medium ${item.days_remaining <= 5 ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`}>
                      <Clock className="h-3 w-3" />
                      {item.days_remaining === 0 ? "Expira hoy" : `${item.days_remaining} día${item.days_remaining !== 1 ? "s" : ""} restante${item.days_remaining !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmRecover}
        onOpenChange={(v) => { if (!v) setConfirmRecover(null); }}
        title="Recuperar oportunidad"
        description={`¿Deseas recuperar "${confirmRecover?.project_name}" y devolverla al pipeline?`}
        onConfirm={() => confirmRecover && handleRecover(confirmRecover)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}
        title="Eliminar permanentemente"
        description={`¿Estás seguro? "${confirmDelete?.project_name}" se eliminará para siempre y no podrá recuperarse.`}
        onConfirm={() => confirmDelete && handlePermanentDelete(confirmDelete)}
      />
    </>
  );
}
