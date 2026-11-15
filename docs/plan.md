# Plan del proyecto

## Objetivo

Que el barbero gestionen sus citas de forma sencilla y que los clientes reserven
en línea sin crear cuenta.

## Decisiones cerradas

| Tema              | Decisión                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Stack             | Next.js 16 + TypeScript + Tailwind 4, Supabase (Postgres + Auth), Netlify                                 |
| Zona horaria      | `America/Costa_Rica`                                                                                      |
| Duración de cita  | 30 minutos (Fase 1); el modelo soporta otras duraciones                                                   |
| Login del barbero | Email + contraseña (Supabase Auth)                                                                        |
| Aviso al cliente  | Enlace `wa.me` con mensaje prellenado                                                                     |
| Aviso al barbero  | Panel + botón de WhatsApp                                                                                 |
| Reglas de reserva | Nombre y teléfono obligatorios, antelación mínima 1 h, máximo 30 días, cancelación del cliente por enlace |
| Multi-barbería    | Preparado en el modelo (`business_id` en todas las tablas), sin UI todavía                                |

## Reglas técnicas no negociables

1. Los cálculos de fecha usan `America/Costa_Rica` explícitamente.
2. La base de datos cambia **solo** por migraciones en `supabase/migrations/`.
3. Las reglas de negocio viven en SQL (`security definer`, `search_path` fijo),
   nunca solo en el cliente.
4. La doble reserva se impide con un `EXCLUDE USING gist` sobre
   `tstzrange(starts_at, ends_at)` por barbero y estado `confirmed`.
5. El público nunca lee ni escribe `appointments` directamente: usa las
   funciones `get_available_slots`, `book_appointment` y `cancel_appointment`.
6. Nunca se usa la clave `service_role` en el cliente.

## Modelo de datos previsto

```
businesses      id, name, slug, timezone, whatsapp_phone, address, currency
barbers         id, business_id, auth_user_id, display_name, active
services        id, business_id, name, duration_minutes, price_cents, active
working_hours   id, barber_id, weekday, start_time, end_time
time_off        id, barber_id, starts_at, ends_at, reason
appointments    id, business_id, barber_id, service_id, customer_name,
                customer_phone, starts_at, ends_at, status, cancel_token
```

El descanso diario se modela como dos tramos de `working_hours`.

## Fases

### Fase 0 — Andamiaje y despliegue

- [x] Next.js + TypeScript + Tailwind, ESLint, Prettier, Vitest.
- [x] `netlify.toml`, `.env.example`, `.gitignore`, README.
- [x] `/api/health` contra Supabase.
- [x] `AGENTS.md` y agentes en `.opencode/agents/`.
- [x] CI de GitHub Actions y plantilla de PR.
- [x] Sitio de Netlify conectado y primer deploy verde.

**Verificación:** URL pública carga · `/api/health` responde `ok` · CI en verde.

### Fase 1.1 — Base de datos, reglas y seguridad

- [x] Migración con tablas, enums, índices y el constraint de exclusión.
- [x] Funciones `get_available_slots`, `book_appointment`, `cancel_appointment`.
- [x] RLS y `GRANT` explícitos (la exposición automática está desactivada).
- [x] Seed real: Charlie's Barbershop, 1 barbero, corte de 30 min ₡6.000,
      miércoles cerrado, 08:00–12:00 y 13:00–18:00.
- [x] Ficha del negocio en [`docs/business.md`](./business.md).
- [ ] Aplicar la migración en Supabase y correr `npm run test:db` (14 en verde).

**Verificación:** doble reserva simultánea rechazada · descanso respetado ·
`<1 h` y `>30 días` rechazados · `anon` no puede leer teléfonos.

### Fase 1.2 — Página pública de reserva

- [ ] Landing mobile-first con datos reales del negocio.
- [ ] Selector de fecha (30 días) y horarios por mañana/tarde.
- [ ] Formulario nombre + teléfono con validación `+506`.
- [ ] Server Action con manejo de conflicto y recarga de horarios.
- [ ] Antispam: honeypot y límite de citas activas por teléfono.

**Verificación:** reserva real desde el celular a 360 px · segundo intento del
mismo bloque muestra mensaje claro.

### Fase 1.3 — Confirmación, WhatsApp y cancelación

- [ ] `/cita/[token]` con resumen y estado.
- [ ] Botón `wa.me` con mensaje prellenado.
- [ ] `.ics` para agregar al calendario.
- [ ] Cancelación con confirmación, hasta el inicio de la cita.
- [ ] Open Graph para la vista previa en WhatsApp.

**Verificación:** mensaje llega correcto · `.ics` abre en el calendario ·
cancelar libera el bloque.

### Fase 1.4 — Login y panel del barbero

- [ ] Auth email + contraseña; ruta protegida.
- [ ] Agenda de hoy y de la semana.
- [ ] Detalle de cita: llamar, WhatsApp, cancelar, completada / no asistió.
- [ ] Cita manual para clientes sin reserva.

**Verificación:** `/admin` sin sesión redirige al login · cancelar libera el
bloque · usable en celular.

### Fase 1.5 — Horarios, descansos y bloqueos

- [ ] Editor de horarios por día con varios tramos.
- [ ] CRUD de bloqueos con aviso si hay cita en el rango.
- [ ] Ajustes del negocio (nombre, WhatsApp, dirección, precio).

**Verificación:** cerrar un día oculta los espacios · cambios sin deploy.

### Fase 1.6 — Endurecimiento y entrega

- [ ] Auditoría de RLS con la clave pública.
- [ ] Responsive y Lighthouse móvil ≥ 90.
- [ ] E2E Playwright del flujo completo.
- [ ] Backup semanal y ping anti-pausa de Supabase.
- [ ] Documentación de operación y tag `v1.0.0`.

## Fase 2 (no implementar todavía)

- Hosting/DB/dominio de pago (Supabase Pro evita pausas y añade backups).
- Recordatorios automáticos (WhatsApp Cloud API / Resend).
- Multi-tenant real: `business_members`, rutas por `/[slug]`, roles.
- Pagos o depósitos (Stripe / SINPE Móvil).
- Servicios con duración y precio variables (el modelo ya lo soporta).
