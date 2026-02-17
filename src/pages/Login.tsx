import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Credenciales incorrectas. Verifica tu email y contraseña."
          : error.message
      );
      setLoading(false);
      return;
    }

    navigate("/");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center"
        style={{ background: "hsl(240, 35%, 14%)" }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "hsl(180, 100%, 30%)" }}
        />
        <div
          className="absolute -bottom-48 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: "hsl(180, 100%, 30%)" }}
        />
        <div
          className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-[0.05]"
          style={{ background: "hsl(180, 80%, 85%)" }}
        />

        <div className="relative z-10 max-w-md px-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
              style={{ background: "hsl(180, 100%, 30%)" }}
            >
              S
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white tracking-tight">SINEM</h1>
              <p className="text-xs text-white/50 font-medium">Siemens Partner RD</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Sistema de Gestión Comercial
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Gestiona tu pipeline de ventas, cotizaciones, clientes y proyectos
            desde una plataforma centralizada y moderna.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { label: "CRM", value: "Pipeline" },
              { label: "Cotizaciones", value: "Ofertas" },
              { label: "Proyectos", value: "Gestión" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg p-3 text-center"
                style={{ background: "hsla(180, 100%, 30%, 0.1)", border: "1px solid hsla(180, 100%, 30%, 0.15)" }}
              >
                <p className="text-xs font-semibold" style={{ color: "hsl(180, 100%, 45%)" }}>
                  {item.value}
                </p>
                <p className="text-[10px] text-white/40 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              style={{ background: "hsl(180, 100%, 30%)" }}
            >
              S
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SINEM</h1>
              <p className="text-[10px] text-muted-foreground">Siemens Partner RD</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Iniciar Sesión</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            SINEM S.R.L. &middot; Sistema de Gestión Comercial
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
