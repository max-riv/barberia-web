# Operación — Charlie's Barbershop

Guía de operación del sistema de reservas. Complementa a `README.md`
(puesta en marcha) y a `docs/plan.md` (fases).

## Arquitectura

- **App:** Next.js 16 (App Router) + TypeScript + Tailwind 4.
- **Base de datos y Auth:** Supabase (Postgres + Auth email/contraseña).
- **Hosting:** Netlify (plan gratuito).
- **Zona horaria del negocio:** `America/Costa_Rica` (UTC−6, sin horario de
  verano). Toda fecha de reserva se calcula en esa zona.

## Despliegue

- `main` despliega automáticamente a producción:
  <https://barberia-web.netlify.app>.
- Cada Pull Request genera una **Deploy Preview** en Netlify (URL única por PR).
- El build corre `npm run build` y publica `.next` (ver `netlify.toml`).
- El CI (`.github/workflows/ci.yml`) corre `format:check`, `lint`, `typecheck`,
  `test` y `build`. Un PR solo debe fusionarse con el CI en verde.

## Variables de entorno

Solo dos variables públicas (la protección real es RLS, no el secreto):

| Variable                        | Dónde                                                 |
| ------------------------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Netlify → Site settings → Environment, y `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | igual que arriba (clave `anon`/`publishable`)         |

La clave `service_role`/`secret` **no se usa** y nunca debe llegar al repo ni al
navegador.

## Migraciones de base de datos

El esquema cambia **solo** por migraciones versionadas en
`supabase/migrations/`, aplicadas a mano en orden de nombre:

1. Abre el archivo de la migración y copia su contenido.
2. Supabase → **SQL Editor** → **New query** → pega → **Run**.
3. Verifica con `npm run test:db` (28 comprobaciones con la clave pública).

Migraciones actuales:

| Archivo                                                    | Qué añade                                             |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| `20261115000000_fase_1_1.sql`                              | tablas, enums, RLS, RPC de reserva/cancelación y seed |
| `20261115000001_fase_1_2_limite_citas.sql`                 | límite de 3 citas futuras por teléfono (antispam)     |
| `20261121000000_fase_1_3_consulta_cita.sql`                | consulta pública de una cita por token                |
| `20261121000001_fix_get_appointment_by_token_currency.sql` | fix de moneda en la consulta por token                |
| `20261124000000_fase_1_4_panel.sql`                        | RPC del panel (agenda, detalle, cita manual, estado)  |
| `20261124000001_fase_1_5_horarios_bloqueos_ajustes.sql`    | editor de horarios, bloqueos y ajustes del negocio    |

Las migraciones son **idempotentes** (se pueden re-ejecutar) y terminan con
`notify pgrst, 'reload schema';` para refrescar la caché de PostgREST.

## Backups

Workflow `.github/workflows/backup-semanal.yml`:

- **Cuándo:** domingos 06:00 UTC (00:00 Costa Rica), y a mano con
  `workflow_dispatch` (Actions → "Backup semanal de Supabase" → Run).
- **Qué hace:** `supabase db dump` del esquema (`backup-schema.sql`) y de los
  datos (`backup-data.sql`), y los sube como **artifact** con **400 días de
  retención**.
- **Dónde está:** Actions → run del workflow → sección **Artifacts** →
  `barberia-backup-<n>`.
- **Requisito:** el secret `SUPABASE_ACCESS_TOKEN` (Settings → Secrets and
  variables → Actions). Es un token de acceso de Supabase con alcance de
  **lectura** de base de datos y de proyecto.

### Alcance del backup

El dump cubre el esquema `public` (citas, negocio, servicios, horarios,
bloqueos). El usuario de **Auth** del barbero (`auth.users`) no se incluye; tras
una restauración se recrea y se vuelve a vincular a mano (ver abajo).

## Restauración

1. Descarga el artifact del backup y descomprímelo.
2. En un proyecto de Supabase destino, aplica en el SQL Editor, en este orden:
   - `backup-schema.sql` (recrea tablas, tipos, funciones, RLS y constraints);
   - `backup-data.sql` (reinserta los datos).
3. Vuelve a sembrar lo que el dump no cubre si hiciera falta (el seed vive en la
   migración 1.1).
4. Recrea el usuario de Auth del barbero (Supabase → Authentication → Users →
   Add user, con su email y contraseña) y vincúlalo:
   `update public.barbers set auth_user_id = '<uid>' where id = '<barber_id>';`.
5. Apunta las variables de entorno de Netlify al nuevo proyecto y redespliega.
6. Verifica con `npm run test:db` y `npm run audit:rls`.

## Anti-pausa de Supabase

El plan gratuito pausa el proyecto tras 7 días de inactividad. El workflow
`.github/workflows/anti-pausa.yml` hace un `GET` a
`https://barberia-web.netlify.app/api/health` **cada 3 días**. Como `/api/health`
ejecuta una consulta real contra la base, eso cuenta como actividad y evita la
pausa.

## Secretos en GitHub

| Secret                  | Para qué                                        |
| ----------------------- | ----------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | workflow de backup semanal (`supabase db dump`) |

Se crean en **Settings → Secrets and variables → Actions → New repository
secret**. Nunca van al diff ni al navegador.

## Salud e incidentes

- `GET /api/health` → `200 {"status":"ok","database":"ok"}` cuando la app habla
  con Supabase; `503` si faltan variables o la base no responde.
- **Sitio caído (503 en health):** revisa las variables de entorno en Netlify y
  el estado del proyecto de Supabase (¿pausado?).
- **Reservas que no entran:** corre `npm run test:db` para descartar un problema
  de reglas/RLS, y revisa que las migraciones estén aplicadas en orden.
- **Auditoría de seguridad:** `npm run audit:rls` comprueba con la clave pública
  qué puede y qué no puede hacer `anon` sobre cada tabla y RPC, y deja el
  reporte en `docs/qa/rls-audit.md`.

## Verificación habitual

| Comando                | Qué verifica                            |
| ---------------------- | --------------------------------------- |
| `npm run lint`         | ESLint                                  |
| `npm run typecheck`    | TypeScript                              |
| `npm run test`         | tests unitarios (Vitest)                |
| `npm run test:db`      | reglas de negocio y RLS contra Supabase |
| `npm run audit:rls`    | auditoría de RLS con la clave pública   |
| `npm run build`        | build de producción                     |
| `npm run format:check` | Prettier (igual que el CI)              |
