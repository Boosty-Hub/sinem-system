# SINEM — Sistema de Gestión

Plataforma interna de SINEM para la gestión comercial y operativa: CRM de
oportunidades, cotizaciones, proyectos, tareas, clientes/contactos, analítica y
forecast, con una propuesta/oferta pública para clientes.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Email:** Resend
- **Deploy:** Netlify

## Módulos

| Ruta | Módulo |
|------|--------|
| `/` | Dashboard |
| `/crm` | CRM — Oportunidades / Prospectos |
| `/cotizaciones` | Cotizaciones (ES/EN) |
| `/clientes` · `/contactos` | Clientes y Contactos |
| `/projects` · `/projects/:id` | Proyectos (pasos 1–11 + archivos) |
| `/tareas` | Tareas (Kanban + Lista) |
| `/analitica` | Analítica y reportes |
| `/forecast` | Forecast / Presupuesto |
| `/oferta/:id` | Propuesta pública (sin auth) |
| `/perfil` | Perfil y preferencias de notificaciones |
| `/configuracion` | Configuración general, usuarios, permisos, campos |

## Desarrollo

Requiere Node.js y npm.

```sh
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:8087)
npm run dev -- --port 8087

# Build de producción
npm run build

# Previsualizar el build
npm run preview
```

## Estructura

```
src/
  pages/                 # Páginas por módulo (CRM, Cotizaciones, Proyectos, …)
  components/            # Componentes UI y de cada módulo
  lib/                   # Tipos, mappers, notificaciones, utilidades
  integrations/supabase/ # Cliente y tipos de Supabase
supabase/
  functions/             # Edge Functions (create-user, update-user, …)
  migrations/            # Migraciones SQL (YYYYMMDDHHMMSS_descripcion.sql)
```

## Notas

- Las cotizaciones soportan español e inglés; la propuesta pública usa los datos
  del aprobador de la cotización.
- Las notificaciones (centro + email) respetan las preferencias `notif_system` y
  `notif_email` de cada usuario.
- Repositorio **privado**: la configuración del proyecto incluye credenciales
  sensibles. No hacerlo público.
