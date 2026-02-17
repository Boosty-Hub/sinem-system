import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Cotizaciones from "./pages/Cotizaciones";
import Clientes from "./pages/Clientes";
import ClienteDetail from "./pages/ClienteDetail";
import Contactos from "./pages/Contactos";
import Configuracion from "./pages/Configuracion";
import ConfigPropuestas from "./pages/configuracion/ConfigPropuestas";
import ConfigUsuarios from "./pages/configuracion/ConfigUsuarios";
import ConfigRoles from "./pages/configuracion/ConfigRoles";
import ConfigPermisos from "./pages/configuracion/ConfigPermisos";
import OfertaPublica from "./pages/OfertaPublica";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/oferta/:id" element={<OfertaPublica />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/cotizaciones" element={<Cotizaciones />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/clientes/:id" element={<ClienteDetail />} />
                <Route path="/contactos" element={<Contactos />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/configuracion" element={<Configuracion />}>
                  <Route index element={<Navigate to="propuestas" replace />} />
                  <Route path="propuestas" element={<ConfigPropuestas />} />
                  <Route path="usuarios" element={<ConfigUsuarios />} />
                  <Route path="roles" element={<ConfigRoles />} />
                  <Route path="permisos" element={<ConfigPermisos />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
