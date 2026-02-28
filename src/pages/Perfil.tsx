import { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { mockAppUsers } from "@/lib/mockData";
import type { AppUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Save, User2, Mail, Phone } from "lucide-react";

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
  const [appUsers, setAppUsers] = useLocalStorage<AppUser[]>("sinem:appUsers", mockAppUsers);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find the current app_user matching the auth user email (or fallback to first)
  const currentUser = appUsers.find((u) => u.email === authUser?.email) ?? appUsers[0];
  const [name, setName] = useState(currentUser?.name ?? "");
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatarUrl ?? "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // For now, use a local object URL as preview. In production this would upload to Supabase Storage.
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const handleSave = () => {
    if (!currentUser) return;
    setAppUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? { ...u, name, phone, avatarUrl: avatarPreview }
          : u
      )
    );
    toast({ title: "Perfil actualizado" });
  };

  if (!currentUser) {
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

      {/* Avatar section */}
      <div className="stat-card p-8 flex flex-col items-center gap-4">
        <div className="relative group">
          <Avatar className="h-28 w-28 text-3xl">
            {avatarPreview ? (
              <AvatarImage src={avatarPreview} alt={name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">{name}</p>
          <p className="text-sm text-muted-foreground">{authUser?.email ?? currentUser.email}</p>
        </div>
      </div>

      {/* Form */}
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
          <Input value={authUser?.email ?? currentUser.email} disabled className="bg-muted/50" />
          <p className="text-[10px] text-muted-foreground">El email se gestiona desde la autenticación y no puede cambiarse aquí.</p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Teléfono
          </Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 809 555-0000" />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
