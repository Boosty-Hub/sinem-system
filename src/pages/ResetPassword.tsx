import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const companyLogo = (() => {
    try { const s = JSON.parse(localStorage.getItem("sinem:general-settings") || "{}"); return s.companyLogoUrl || null; } catch { return null; }
  })();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    // Supabase automatically picks up the recovery token from the URL hash
    // and establishes a session. We listen for the PASSWORD_RECOVERY event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if a session already exists (user may have already been redirected)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // Timeout — if no session after 5 seconds, show error
    const timer = setTimeout(() => {
      setSessionReady((ready) => {
        if (!ready) setSessionError(true);
        return ready;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/"), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="h-10 rounded-lg object-contain" />
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              style={{ background: "hsl(180, 100%, 30%)" }}
            >
              S
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">SINEM</h1>
            <p className="text-[10px] text-muted-foreground">Siemens Partner RD</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-8 animate-fade-in">
            <CheckCircle2 className="h-12 w-12 text-sinem-success mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Contraseña actualizada</h2>
            <p className="text-sm text-muted-foreground">
              Tu contraseña ha sido cambiada exitosamente. Redirigiendo al sistema...
            </p>
          </div>
        ) : sessionError ? (
          <div className="text-center py-8 animate-fade-in">
            <AlertTriangle className="h-12 w-12 text-sinem-warning mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Enlace inválido o expirado</h2>
            <p className="text-sm text-muted-foreground mb-4">
              El enlace de recuperación ha expirado o es inválido. Solicita uno nuevo desde la página de inicio de sesión.
            </p>
            <Button variant="outline" onClick={() => navigate("/login")}>
              Ir al Login
            </Button>
          </div>
        ) : !sessionReady ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Verificando enlace de recuperación...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Nueva Contraseña</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Ingresa tu nueva contraseña para tu cuenta
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-11"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Actualizando...</>
                ) : (
                  "Cambiar Contraseña"
                )}
              </Button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          SINEM S.R.L. &middot; Sistema de Gestión Comercial
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
