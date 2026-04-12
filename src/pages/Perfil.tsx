import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Save, User2, Mail, Phone, Loader2, Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const Perfil = () => {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [notifSystem, setNotifSystem] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  useEffect(() => {
    if (!authUser?.email) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", authUser.email!)
        .maybeSingle();
      if (data) {
        setAppUserId(data.id);
        setName(data.name);
        setPhone(data.phone ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setAvatarPreview(data.avatar_url ?? "");
        setNotifSystem(data.notif_system ?? true);
        setNotifEmail(data.notif_email ?? false);
      }
      setLoading(false);
    };
    fetch();
  }, [authUser?.email]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!appUserId) return;
    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${appUserId}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        finalAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      const { error } = await supabase
        .from("app_users")
        .update({
          name,
          phone,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appUserId);

      if (error) throw error;
      setAvatarUrl(finalAvatarUrl);
      setAvatarFile(null);
      toast({ title: "Perfil actualizado" });
    } catch (err: any) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifPrefs = async () => {
    if (!appUserId) return;
    setSavingNotif(true);
    const { error } = await supabase
      .from("app_users")
      .update({ notif_system: notifSystem, notif_email: notifEmail } as any)
      .eq("id", appUserId);
    if (error) {
      toast({ title: "Error al guardar preferencias", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Preferencias de notificaciones guardadas" });
    }
    setSavingNotif(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!appUserId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No se encontró el usuario.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona tu información personal y foto de perfil</p>
      </div>

      <div className="stat-card p-8 flex flex-col items-center gap-4">
        <div className="relative group">
          <Avatar className="h-28 w-28 text-3xl">
            {avatarPreview ? <AvatarImage src={avatarPreview} alt={name} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {getInitials(name || "U")}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">{name}</p>
          <p className="text-sm text-muted-foreground">{authUser?.email}</p>
        </div>
      </div>

      <div className="stat-card p-6 space-y-5">
        <h3 className="font-semibold text-sm mb-2">Información Personal</h3>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <User2 className="h-3.5 w-3.5 text-muted-foreground" /> Nombre Completo
          </Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre completo" />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
          </Label>
          <Input value={authUser?.email ?? ""} disabled className="bg-muted/50" />
          <p className="text-[10px] text-muted-foreground">El email se gestiona desde la autenticación y no puede cambiarse aquí.</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Teléfono
          </Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 809 555-0000" />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="stat-card p-6 space-y-5">
        <div>
          <h3 className="font-semibold text-sm">Preferencias de Notificaciones</h3>
          <p className="text-xs text-muted-foreground mt-1">Controla cómo y cuándo recibes notificaciones del sistema.</p>
        </div>

        <div className="space-y-4">
          {/* System notifications */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/60 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${notifSystem ? "bg-primary/10" : "bg-muted"}`}>
                <Bell className={`h-4 w-4 ${notifSystem ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-medium">Notificaciones del Sistema</p>
                <p className="text-xs text-muted-foreground">Recibe alertas en el centro de notificaciones cuando te asignen tareas, mencionen o haya actividad relevante.</p>
              </div>
            </div>
            <Switch
              checked={notifSystem}
              onCheckedChange={setNotifSystem}
            />
          </div>

          {/* Email notifications */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/60 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${notifEmail ? "bg-blue-500/10" : "bg-muted"}`}>
                <Mail className={`h-4 w-4 ${notifEmail ? "text-blue-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-medium">Notificaciones por Correo</p>
                <p className="text-xs text-muted-foreground">Recibe un email en <span className="font-medium">{authUser?.email}</span> cada vez que se genere una notificación para ti.</p>
              </div>
            </div>
            <Switch
              checked={notifEmail}
              onCheckedChange={setNotifEmail}
            />
          </div>
        </div>

        {!notifSystem && !notifEmail && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
            <BellOff className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Tienes todas las notificaciones desactivadas. No recibirás alertas de ningún tipo.</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button onClick={handleSaveNotifPrefs} disabled={savingNotif} variant="outline">
            {savingNotif ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar Preferencias
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
