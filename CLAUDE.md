# CLAUDE.md — SINEM Sistema

Guía de contexto para Claude Code en este proyecto. Leer antes de cualquier tarea.

---

## Stack Tecnológico

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Email**: Resend API
- **Deploy**: Netlify (`netlify.toml` configurado)
- **Package manager**: npm (usar `npm run dev` para servidor local, puerto 8080/8081)

---

## Supabase — Acceso Directo por API

### Credenciales del proyecto

| Variable | Valor |
|----------|-------|
| **Project ID** | `fxsshhrxzjyjvfszaorq` |
| **Project URL** | `https://fxsshhrxzjyjvfszaorq.supabase.co` |
| **Management API Token** | `sbp_6b72188f02a837f2ef98b8e755eaa497b4a6bd73` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4c3NoaHJ4emp5anZmc3phb3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyOTEwODQsImV4cCI6MjA4Njg2NzA4NH0.qJl7Dle-5iqFnNXir4mDPKR2c3-s8Og4e_6h6ZgquIE` |

### Ejecutar SQL directo
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/fxsshhrxzjyjvfszaorq/database/query" \
  -H "Authorization: Bearer sbp_6b72188f02a837f2ef98b8e755eaa497b4a6bd73" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM tabla LIMIT 5;"}'
```

### Desplegar Edge Function nueva
```bash
# 1. Generar payload con Node
node -e "
const fs = require('fs');
const code = fs.readFileSync('supabase/functions/NOMBRE/index.ts', 'utf8');
fs.writeFileSync('/tmp/fn.json', JSON.stringify({ slug: 'NOMBRE', name: 'NOMBRE', verify_jwt: false, body: code }));
"
# 2. Subir
curl -s -X POST "https://api.supabase.com/v1/projects/fxsshhrxzjyjvfszaorq/functions" \
  -H "Authorization: Bearer sbp_6b72188f02a837f2ef98b8e755eaa497b4a6bd73" \
  -H "Content-Type: application/json" \
  -d @/tmp/fn.json
```

### Actualizar Edge Function existente
```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/fxsshhrxzjyjvfszaorq/functions/SLUG" \
  -H "Authorization: Bearer sbp_6b72188f02a837f2ef98b8e755eaa497b4a6bd73" \
  -H "Content-Type: application/json" \
  -d @/tmp/fn.json
```

### Agregar/actualizar secrets (variables de entorno para Edge Functions)
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/fxsshhrxzjyjvfszaorq/secrets" \
  -H "Authorization: Bearer sbp_6b72188f02a837f2ef98b8e755eaa497b4a6bd73" \
  -H "Content-Type: application/json" \
  -d '[{"name": "NOMBRE_VAR", "value": "valor"}]'
```

### Listar Edge Functions desplegadas
```bash
curl -s "https://api.supabase.com/v1/projects/fxsshhrxzjyjvfszaorq/functions" \
  -H "Authorization: Bearer sbp_6b72188f02a837f2ef98b8e755eaa497b4a6bd73"
```

---

## Edge Functions Activas

| Slug | Versión | Descripción |
|------|---------|-------------|
| `create-user` | v9 | Crea usuarios en auth + app_users |
| `update-user` | v6 | Actualiza usuario (incluye `phone` y `cargo`) |
| `send-notification-email` | v1 | Envía email via Resend cuando `notif_email = true` |
| `seed-admin` | v3 | Seed inicial de admin |

---

## Secrets configurados en Edge Functions

| Secret | Descripción |
|--------|-------------|
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_ANON_KEY` | Clave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (admin) |
| `SUPABASE_DB_URL` | URL directa a PostgreSQL |
| `RESEND_API_KEY` | `re_AiCtmmyU_NmBnDZMzaiqo22PJaEtX5N3A` — emails via Resend |

---

## Esquema de Base de Datos — Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `app_users` | Usuarios del sistema (perfiles, roles, preferencias) |
| `prospects` | Oportunidades CRM |
| `quotations` | Cotizaciones |
| `quotation_line_items` | Ítems de cotizaciones |
| `projects` | Proyectos |
| `tasks` | Tareas |
| `task_comments` | Comentarios de tareas |
| `task_stages` | Etapas del kanban de tareas (Pendiente, En Progreso, Completada) |
| `clients` | Clientes |
| `contacts` | Contactos |
| `notifications` | Centro de notificaciones |
| `proposal_settings` | Configuración de propuesta/oferta pública |
| `general_settings` | Configuración general (logo, BUs, partners, etc.) |
| `roles` | Roles y permisos |
| `permissions` | Permisos por módulo/rol |
| `required_fields` | Campos obligatorios configurables por módulo |
| `forecast_months` / `forecast_years` | Datos de presupuesto/forecast |

### Columnas importantes en `app_users`
```sql
id, auth_user_id, name, email, phone, cargo,
avatar_url, role_id, status,
notif_system (bool, default true),  -- notificaciones en centro
notif_email  (bool, default true),  -- notificaciones por correo
created_at, updated_at
```

### Columnas importantes en `tasks`
```sql
id, title, description, status, priority,
assignee (nombre como string),
created_by (uuid → app_users),
stage_id (uuid → task_stages),
client_id, project_id, prospect_id,
due_date, created_at, updated_at
```

### Columnas importantes en `quotations`
```sql
id, code, subject, status, approval_status,
approved_by (uuid → app_users), approved_at, approval_note,
created_by (uuid → app_users),
prospect_id, client_id, contact_id,
...campos financieros...
```

---

## Convenciones del Proyecto

### Notificaciones
- Usar siempre `createNotification()` de `src/lib/notifications.ts`
- La función verifica automáticamente `notif_system` y `notif_email` del usuario
- Tipos válidos: `"crm" | "task" | "project" | "quotation" | "client" | "info" | "mention"`
- Solo crear notificaciones para usuarios **involucrados** (asignado, mencionado, creador)

### Supabase Client
- Importar desde `@/integrations/supabase/client` (no desde `@/lib/supabase`) en la mayoría de módulos
- Algunos archivos legacy usan `@/lib/supabase` — ambos apuntan al mismo proyecto

### Migraciones SQL
- Guardar archivos en `supabase/migrations/` con formato `YYYYMMDDHHMMSS_descripcion.sql`
- **Siempre ejecutar inmediatamente via API** — no depender del CLI de Supabase
- Usar `IF NOT EXISTS` para evitar errores en columnas/tablas

### Storage Buckets
- `project-files` — archivos de proyectos (pasos 1-11)
- `avatars` — fotos de perfil de usuarios
- `company-assets` — logo de la empresa

### Oferta Pública / Propuesta
- Ruta: `/oferta/:id`
- La firma en la propuesta usa datos del **aprobador** (`approved_by` → `app_users`)
- Si no hay aprobador, usa valores de `proposal_settings` como fallback
- Los datos del aprobador incluyen: `name`, `cargo`, `phone`, `email`

---

## Patrones de Código Frecuentes

### Agregar columna a tabla existente
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/fxsshhrxzjyjvfszaorq/database/query" \
  -H "Authorization: Bearer sbp_6b72188f02a837f2ef98b8e755eaa497b4a6bd73" \
  -H "Content-Type: application/json" \
  -d '{"query": "alter table TABLA add column if not exists COLUMNA TIPO default VALOR;"}'
```

### Verificar columnas de una tabla
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/fxsshhrxzjyjvfszaorq/database/query" \
  -H "Authorization: Bearer sbp_6b72188f02a837f2ef98b8e755eaa497b4a6bd73" \
  -H "Content-Type: application/json" \
  -d '{"query": "select column_name, data_type, column_default from information_schema.columns where table_name = '"'"'TABLA'"'"' order by ordinal_position;"}'
```

### Iniciar servidor de desarrollo
```bash
npm run dev
# Corre en http://localhost:8080 (o 8081 si el puerto está ocupado)
```

---

## Módulos del Sistema

| Ruta | Módulo |
|------|--------|
| `/` | Dashboard |
| `/crm` | CRM — Oportunidades/Prospectos |
| `/cotizaciones` | Cotizaciones |
| `/clientes` | Clientes |
| `/contactos` | Contactos |
| `/projects` | Proyectos |
| `/projects/:id` | Detalle de Proyecto (pasos 1-11 + archivos) |
| `/tareas` | Tareas (Kanban + Lista) |
| `/analitica` | Analítica y reportes |
| `/forecast` | Forecast / Presupuesto |
| `/oferta/:id` | Propuesta pública (sin auth) |
| `/perfil` | Perfil de usuario + preferencias de notificaciones |
| `/configuracion` | Configuración general, usuarios, permisos, campos |
