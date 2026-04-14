import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";

const SUPABASE_URL = "https://fxsshhrxzjyjvfszaorq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4c3NoaHJ4emp5anZmc3phb3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyOTEwODQsImV4cCI6MjA4Njg2NzA4NH0.qJl7Dle-5iqFnNXir4mDPKR2c3-s8Og4e_6h6ZgquIE";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Read company logo from general settings
  const companyLogo = (() => {
    try { const s = JSON.parse(localStorage.getItem("sinem:general-settings") || "{}"); return s.companyLogoUrl || null; } catch { return null; }
  })();
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!resetEmail.trim()) { setError("Ingresa tu correo electrónico."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  };

  const handlePinChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);

    if (digit && index < 3) {
      pinRefs[index + 1].current?.focus();
    }

    // Auto-authenticate when all 4 digits are filled
    if (digit && index === 3) {
      const pin = [...next.slice(0, 3), digit].join("");
      if (pin.length === 4) handlePinLogin(pin);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (pinDigits[index]) {
        const next = [...pinDigits];
        next[index] = "";
        setPinDigits(next);
      } else if (index > 0) {
        pinRefs[index - 1].current?.focus();
        const next = [...pinDigits];
        next[index - 1] = "";
        setPinDigits(next);
      }
    }
  };

  const handlePinLogin = async (pin: string) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/pin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ pin }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "PIN incorrecto");
        setPinDigits(["", "", "", ""]);
        setTimeout(() => pinRefs[0].current?.focus(), 50);
        setLoading(false);
        return;
      }

      // Exchange the token_hash for a real session
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: result.token_hash,
        type: "magiclink",
      });

      if (verifyError) {
        setError("Error al iniciar sesión. Intenta de nuevo.");
        setPinDigits(["", "", "", ""]);
        setTimeout(() => pinRefs[0].current?.focus(), 50);
        setLoading(false);
        return;
      }

      navigate("/");
    } catch {
      setError("Error de conexión. Verifica tu red.");
      setLoading(false);
    }
  };

  const switchToPinMode = () => {
    setPinMode(true);
    setError("");
    setPinDigits(["", "", "", ""]);
    setTimeout(() => pinRefs[0].current?.focus(), 100);
  };

  const switchToEmailMode = () => {
    setPinMode(false);
    setError("");
    setPinDigits(["", "", "", ""]);
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
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="h-12 rounded-xl object-contain" />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                style={{ background: "hsl(180, 100%, 30%)" }}
              >
                S
              </div>
            )}
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

          {forgotMode ? (
            // ── Forgot Password View ──
            <>
              <button
                onClick={() => { setForgotMode(false); setResetSent(false); setError(""); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Volver al login
              </button>

              {resetSent ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-sinem-success mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">Correo enviado</h2>
                  <p className="text-sm text-muted-foreground">
                    Revisa tu bandeja de entrada en <strong>{resetEmail}</strong>. Haz clic en el enlace del correo para restablecer tu contraseña.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold tracking-tight">Recuperar Contraseña</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
                    </p>
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Correo electrónico</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="tu@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        autoComplete="email"
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
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                      ) : (
                        "Enviar enlace de recuperación"
                      )}
                    </Button>
                  </form>
                </>
              )}
            </>
          ) : pinMode ? (
            // ── PIN Login View ──
            <>
              <button
                onClick={switchToEmailMode}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Volver al login
              </button>

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <KeyRound className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Acceso con PIN</h2>
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  Ingresa tu código PIN de 4 dígitos para acceder
                </p>
              </div>

              <div className="space-y-6">
                {/* PIN boxes */}
                <div className="flex justify-center gap-3">
                  {pinDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={pinRefs[i]}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      disabled={loading}
                      className={`
                        w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 bg-background
                        focus:outline-none focus:ring-0 transition-all
                        ${digit ? "border-primary bg-primary/5 text-primary" : "border-border"}
                        ${loading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}
                      `}
                      style={{ caretColor: "transparent" }}
                    />
                  ))}
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Verificando PIN...
                  </div>
                )}

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20 text-center">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={switchToEmailMode}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" /> Ingresar con correo y contraseña
                </button>
              </div>
            </>
          ) : (
            // ── Email/Password Login View ──
            <>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setError(""); setResetEmail(email); }}
                      className="text-xs text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
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

                {/* PIN access button */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-2 text-muted-foreground">o</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={switchToPinMode}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border border-border/60 text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <KeyRound className="h-4 w-4 text-primary" />
                  Ingresar con PIN
                </button>
              </form>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground mt-8">
            SINEM S.R.L. &middot; Sistema de Gestión Comercial
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
