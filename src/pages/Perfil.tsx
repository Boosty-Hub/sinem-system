import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Save, User2, Mail, Phone, Loader2, Bell, BellOff, PenLine, Trash2, Upload, Lock, KeyRound, Eye, EyeOff } from "lucide-react";
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
  const [roleName, setRoleName] = useState<string>("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [signaturePreview, setSignaturePreview] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pin, setPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

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
        setSignatureUrl((data as any).signature_image_url ?? "");
        setSignaturePreview((data as any).signature_image_url ?? "");
        // Fetch role name
        if (data.role_id) {
          const { data: roleRow } = await supabase
            .from("roles")
            .select("name")
            .eq("id", data.role_id)
            .maybeSingle();
          if (roleRow) setRoleName(roleRow.name ?? "");
        }
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

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));
  };

  const handleSaveSignature = async () => {
    if (!appUserId || !signatureFile) return;
    setSavingSignature(true);
    try {
      const ext = signatureFile.name.split(".").pop();
      const path = `signatures/${appUserId}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, signatureFile, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const finalUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error } = await supabase
        .from("app_users")
        .update({ signature_image_url: finalUrl } as any)
        .eq("id", appUserId);
      if (error) throw error;
      setSignatureUrl(finalUrl);
      setSignatureFile(null);
      toast({ title: "Firma guardada correctamente" });
    } catch (err: any) {
      toast({ title: "Error al guardar firma", description: err.message, variant: "destructive" });
    } finally {
      setSavingSignature(false);
    }
  };

  const handleRemoveSignature = async () => {
    if (!appUserId) return;
    const { error } = await supabase
      .from("app_users")
      .update({ signature_image_url: null } as any)
      .eq("id", appUserId);
    if (error) {
      toast({ title: "Error al eliminar firma", description: error.message, variant: "destructive" });
      return;
    }
    setSignatureUrl("");
    setSignaturePreview("");
    setSignatureFile(null);
    toast({ title: "Firma eliminada" });
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

  const handlePasswordChange = async () => {
    if (!authUser?.email) return;
    if (!currentPassword) {
      toast({ title: "Ingresa tu contraseña actual", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "La nueva contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: currentPassword,
      });
      if (verifyError) {
        toast({ title: "Contraseña actual incorrecta", variant: "destructive" });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Contraseña actualizada correctamente" });
    } catch (err: any) {
      toast({ title: "Error al actualizar contraseña", description: err.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSavePin = async () => {
    if (!appUserId) return;
    if (pin && !/^\d{4}$/.test(pin)) {
      toast({ title: "El PIN debe ser exactamente 4 dígitos numéricos", variant: "destructive" });
      return;
    }
    setSavingPin(true);
    const { error } = await supabase
      .from("app_users")
      .update({ pin_code: pin || null } as any)
      .eq("id", appUserId);
    if (error) {
      toast({ title: "Error al guardar el PIN", description: error.message, variant: "destructive" });
    } else {
      toast({ title: pin ? "PIN guardado correctamente" : "PIN eliminado" });
      if (!pin) setPin("");
    }
    setSavingPin(false);
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

      {/* Digital Signature — only for Administrador and Gerente de Operaciones */}
      {(roleName === "Administrador" || roleName === "Gerente de Operaciones") && (
        <div className="stat-card p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <PenLine className="h-3.5 w-3.5 text-muted-foreground" /> Firma Digital
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tu firma aparecerá en la URL pública de las cotizaciones que apruebes.
            </p>
          </div>

          {signaturePreview ? (
            <div className="flex flex-col gap-3">
              <div className="border rounded-lg p-4 bg-muted/20 flex items-center justify-center min-h-[100px]">
                <img
                  src={signaturePreview}
                  alt="Firma digital"
                  className="max-h-24 max-w-xs object-contain"
                  style={{ mixBlendMode: "multiply" }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => signatureInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" /> Reemplazar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemoveSignature}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                </Button>
                {signatureFile && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveSignature}
                    disabled={savingSignature}
                    className="ml-auto"
                  >
                    {savingSignature ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Guardar Firma
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => signatureInputRef.current?.click()}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Subir imagen de firma</p>
                <p className="text-xs text-muted-foreground mt-0.5">PNG o JPG con fondo transparente recomendado</p>
              </div>
            </div>
          )}

          <input
            ref={signatureInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSignatureFileChange}
          />
        </div>
      )}

      {/* Security — available to all roles */}
      <div className="stat-card p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Seguridad
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Actualiza tu contraseña y gestiona tu PIN de acceso rápido.</p>
        </div>

        {/* Password change */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-foreground/80">Cambiar Contraseña</p>

          <div className="space-y-2">
            <Label className="text-xs">Contraseña actual</Label>
            <div className="relative">
              <Input
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Nueva contraseña</Label>
            <div className="relative">
              <Input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Confirmar nueva contraseña</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-destructive">Las contraseñas no coinciden</p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={handlePasswordChange}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              size="sm"
            >
              {savingPassword ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Lock className="h-4 w-4 mr-1" />}
              Actualizar contraseña
            </Button>
          </div>
        </div>

        <div className="border-t border-border/40 pt-5 space-y-3">
          <p className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> PIN de acceso rápido
          </p>
          <p className="text-[11px] text-muted-foreground">
            Permite iniciar sesión usando solo 4 dígitos en la pantalla de login. Deja el campo vacío para eliminar el PIN actual.
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="_ _ _ _"
              className="w-28 text-center tracking-widest text-lg font-mono"
            />
            <Button
              onClick={handleSavePin}
              disabled={savingPin}
              variant="outline"
              size="sm"
            >
              {savingPin ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {pin ? "Guardar PIN" : "Eliminar PIN"}
            </Button>
          </div>
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
