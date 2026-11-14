<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Proyecto: Barbería (reservas de citas)

App de reservas para un barbero: los clientes reservan en bloques de 30 minutos
sin crear cuenta y el barbero gestiona su agenda desde un panel privado.

Lee `docs/plan.md` antes de empezar. Ahí están las fases y los criterios de
aceptación.

## Comandos

```bash
npm run dev          # desarrollo
npm run build        # build de producción
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Vitest
npm run format       # Prettier
npm run test:db      # tests de base de datos (desde la Fase 1.1)
```

## Reglas de negocio

- Cada cita dura 30 minutos y los espacios empiezan en :00 y :30.
- Zona horaria `America/Costa_Rica` (UTC−6, sin horario de verano). Nunca uses
  `new Date()` sin fijar la zona horaria explícitamente.
- Antelación mínima: 1 hora. Máximo hacia adelante: 30 días.
- Nombre y teléfono son obligatorios. Teléfonos de Costa Rica se normalizan a
  E.164 (`+506XXXXXXXX`).
- Un espacio ocupado no puede reservarse dos veces, ni con peticiones
  simultáneas.
- El cliente puede cancelar con su enlace hasta el inicio de la cita.

## Reglas técnicas

- La base de datos cambia **solo** por migraciones en `supabase/migrations/`.
  Nunca edites el esquema desde el dashboard.
- Las reglas de negocio se aplican en SQL (`security definer`, `search_path`
  fijo). El cliente no es la fuente de verdad.
- La doble reserva se impide con `EXCLUDE USING gist` sobre
  `tstzrange(starts_at, ends_at)` por barbero y estado `confirmed`.
- El público solo ejecuta RPC y lee datos del negocio: nunca `appointments`.
- Prohibido usar la clave `service_role`/`secret`.
- TypeScript estricto: sin `any` nuevos ni `@ts-ignore` sin justificar.
- Mobile-first: diseña y verifica a 360 px de ancho.
- Textos de interfaz en español, con tuteo neutro.

## Carpetas

```
src/app/          rutas (público en la raíz, panel en /admin)
src/components/   componentes de UI
src/lib/          utilidades, cliente de Supabase, fechas
src/actions/      Server Actions
src/types/        tipos generados de la base de datos
supabase/         migraciones y seed
tests/unit/       Vitest
tests/e2e/        Playwright
```

## Flujo de trabajo

- Nunca hagas `git commit`, `git push` ni `git reset` (a menos que se te pida
  explícitamente): el agente líder se encarga.
- No toques archivos fuera de las carpetas asignadas a tu agente.
- Antes de reportar algo como terminado: `npm run lint`, `npm run typecheck` y
  `npm run test`.
- Si el contrato (tipos, firmas de RPC, server actions) no alcanza, repórtalo;
  no lo cambies por tu cuenta.
