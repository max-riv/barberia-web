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

| Comando             | Qué hace                    |
| ------------------- | --------------------------- |
| `npm run dev`       | Servidor de desarrollo      |
| `npm run build`     | Build de producción         |
| `npm run lint`      | ESLint                      |
| `npm run typecheck` | TypeScript sin emitir       |
| `npm run test`      | Tests unitarios (Vitest)    |
| `npm run format`    | Prettier sobre todo el repo |

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
- [ ] **Fase 1.1** — base de datos, reglas y RLS.
- [ ] **Fase 1.2** — página pública de reserva.
- [ ] **Fase 1.3** — confirmación, WhatsApp y cancelación.
- [ ] **Fase 1.4** — login y panel del barbero.
- [ ] **Fase 1.5** — horarios, descansos y bloqueos.
- [ ] **Fase 1.6** — endurecimiento y entrega.
