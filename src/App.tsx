import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import { PermissionsProvider } from "./hooks/usePermissions";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedModule from "./components/ProtectedModule";
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
import ConfigGeneral from "./pages/configuracion/ConfigGeneral";
import ConfigProveedores from "./pages/configuracion/ConfigProveedores";
import ConfigCamposObligatorios from "./pages/configuracion/ConfigCamposObligatorios";
import OfertaPublica from "./pages/OfertaPublica";
import Tareas from "./pages/Tareas";
import Analitica from "./pages/Analitica";
import Perfil from "./pages/Perfil";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <PermissionsProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/oferta/:id" element={<OfertaPublica />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<ProtectedModule module="Dashboard"><Dashboard /></ProtectedModule>} />
                <Route path="/crm" element={<ProtectedModule module="CRM"><CRM /></ProtectedModule>} />
                <Route path="/cotizaciones" element={<ProtectedModule module="Cotizaciones"><Cotizaciones /></ProtectedModule>} />
                <Route path="/clientes" element={<ProtectedModule module="Clientes"><Clientes /></ProtectedModule>} />
                <Route path="/clientes/:id" element={<ProtectedModule module="Clientes"><ClienteDetail /></ProtectedModule>} />
                <Route path="/contactos" element={<ProtectedModule module="Contactos"><Contactos /></ProtectedModule>} />
                <Route path="/projects" element={<ProtectedModule module="Proyectos"><Projects /></ProtectedModule>} />
                <Route path="/projects/:id" element={<ProtectedModule module="Proyectos"><ProjectDetail /></ProtectedModule>} />
                <Route path="/tareas" element={<ProtectedModule module="Tareas"><Tareas /></ProtectedModule>} />
                <Route path="/forecast" element={<Navigate to="/analitica" replace />} />
                <Route path="/analitica" element={<ProtectedModule module="Analítica"><Analitica /></ProtectedModule>} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/configuracion" element={<ProtectedModule module={["Config: General","Config: Propuestas","Config: Campos Obligatorios","Config: Usuarios","Config: Roles","Config: Permisos","Proveedores"]}><Configuracion /></ProtectedModule>}>
                  <Route index element={<Navigate to="propuestas" replace />} />
                  <Route path="propuestas" element={<ProtectedModule module="Config: Propuestas"><ConfigPropuestas /></ProtectedModule>} />
                  <Route path="usuarios" element={<ProtectedModule module="Config: Usuarios"><ConfigUsuarios /></ProtectedModule>} />
                  <Route path="roles" element={<ProtectedModule module="Config: Roles"><ConfigRoles /></ProtectedModule>} />
                  <Route path="permisos" element={<ProtectedModule module="Config: Permisos"><ConfigPermisos /></ProtectedModule>} />
                  <Route path="general" element={<ProtectedModule module="Config: General"><ConfigGeneral /></ProtectedModule>} />
                  <Route path="proveedores" element={<ProtectedModule module="Proveedores"><ConfigProveedores /></ProtectedModule>} />
                  <Route path="campos" element={<ProtectedModule module="Config: Campos Obligatorios"><ConfigCamposObligatorios /></ProtectedModule>} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </PermissionsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
