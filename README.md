# Barbería · Reservas de citas

Aplicación web para que un barbero gestione su agenda y sus clientes reserven
en línea, sin crear cuenta.

- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase
  (Postgres + Auth) · Netlify.
- **Costo:** solo capas gratuitas, sin tarjeta.
- **Zona horaria:** `America/Costa_Rica` (UTC−6, sin horario de verano).

## Requisitos

- Node.js 22 o superior.
- Una cuenta de [Supabase](https://supabase.com) y otra de
  [Netlify](https://netlify.com) (ambas gratis).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y rellena los valores
npm run dev
```

`.env.local` necesita, desde Supabase → _Project Settings → API_:

| Variable                        | Valor                        |
| ------------------------------- | ---------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://<ref>.supabase.co`  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave `anon` / `publishable` |

La clave `service_role` / `secret` **no se usa en este proyecto** y nunca debe
llegar al navegador ni al repositorio.

## Scripts

| Comando             | Qué hace                              |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                |
| `npm run build`     | Build de producción                   |
| `npm run lint`      | ESLint                                |
| `npm run typecheck` | TypeScript sin emitir                 |
| `npm run test`      | Tests unitarios (Vitest)              |
| `npm run test:db`   | Reglas de negocio en Supabase         |
| `npm run audit:rls` | Auditoría de RLS con la clave pública |
| `npm run format`    | Prettier sobre todo el repo           |

## Base de datos

La base vive en Supabase y cambia **solo** por migraciones versionadas en
[`supabase/migrations/`](./supabase/migrations). No se edita el esquema desde el
dashboard.

1. Abre el archivo de la migración y copia todo su contenido.
2. Supabase → **SQL Editor** → **New query** → pega → **Run**.
3. Verifica las reglas desde la terminal:

```bash
npm run test:db
```

Las migraciones se aplican **en orden de nombre**, una sola vez:

| Archivo                                                    | Qué añade                                         |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `20261115000000_fase_1_1.sql`                              | tablas, RLS, RPC de reserva y cancelación         |
| `20261115000001_fase_1_2_limite_citas.sql`                 | límite de 3 citas futuras por teléfono (antispam) |
| `20261121000000_fase_1_3_consulta_cita.sql`                | consulta pública de una cita por token            |
| `20261121000001_fix_get_appointment_by_token_currency.sql` | fix de moneda en la consulta por token            |
| `20261124000000_fase_1_4_panel.sql`                        | RPC del panel (agenda, detalle, cita manual)      |
| `20261124000001_fase_1_5_horarios_bloqueos_ajustes.sql`    | horarios, bloqueos y ajustes del negocio          |

La guía de operación (despliegue, backups, restauración, anti-pausa) está en
[`docs/operacion.md`](./docs/operacion.md).

El script usa la clave pública y comprueba las reglas reales: doble reserva,
concurrencia, descanso, antelación, rango de 30 días, miércoles cerrado,
teléfonos, cancelación y RLS. Crea citas de prueba y las cancela al terminar;
por eso no corre en CI y solo debe apuntar al proyecto de desarrollo.

Los datos del negocio están en [`docs/business.md`](./docs/business.md) y en el
seed de la migración.

## Reserva pública

- `/` muestra el servicio, el precio y el horario reales del negocio.
- `/reservar` lista los próximos 30 días con atención y los espacios libres de
  cada día, separados en mañana y tarde.
- El cliente elige un bloque de 30 minutos y solo deja nombre y teléfono. El
  teléfono se normaliza a `+506XXXXXXXX`.
- La página funciona sin JavaScript: día y hora son enlaces (`?fecha=` y
  `?hora=`), y el formulario se envía con una Server Action.
- La base de datos vuelve a validar antelación, horario, bloqueos y doble
  reserva; el navegador no es la fuente de verdad.

## Verificar el despliegue

`GET /api/health` responde `200` con `{"status":"ok"}` cuando la app habla con
Supabase, y `503` cuando faltan variables o la base no responde.

## Flujo de trabajo

- `main` está protegida: solo entra por Pull Request con CI en verde.
- Una rama corta por fase: `feat/1.2-reserva-publica`, `fix/...`, `chore/...`.
- Commits con [Conventional Commits](https://www.conventionalcommits.org/),
  uno por cambio lógico, en español: `feat(booking): selector de fecha`.
- Merge con **squash**.
- Netlify despliega `main` en producción y cada PR en una _Deploy Preview_.

Las reglas para agentes y personas están en [`AGENTS.md`](./AGENTS.md) y el plan
por fases en [`docs/plan.md`](./docs/plan.md).

## Estado

- [x] **Fase 0** — andamiaje, despliegue y verificación de salud.
- [x] **Fase 1.1** — base de datos, reglas y RLS.
- [x] **Fase 1.2** — página pública de reserva.
- [x] **Fase 1.3** — confirmación, WhatsApp y cancelación.
- [x] **Fase 1.4** — login y panel del barbero.
- [x] **Fase 1.5** — horarios, descansos y bloqueos.
- [ ] **Fase 1.6** — endurecimiento y entrega (en curso).
