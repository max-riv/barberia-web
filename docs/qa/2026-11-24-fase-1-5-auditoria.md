# Auditoría QA · Fase 1.5 — Horarios, descansos y bloqueos

Fecha: 2026-11-24 · Agente: QA · Resultado: **APTO** (con verificación manual pendiente)

## Alcance

Migración `20261124000001_fase_1_5_horarios_bloqueos_ajustes.sql` (ya aplicada
en Supabase), librerías `src/lib/schedule.ts`, `src/lib/settings.ts`,
`src/lib/booking.ts` (`crLocalToIsoUtc`), `admin-state.ts`, `admin-data.ts`,
acciones `admin-schedule.ts`, `admin-settings.ts`, páginas y componentes del
panel (`horarios`, `ajustes`) y `scripts/db-smoke-test.mjs`.

## Comandos ejecutados (estado final del árbol)

| Comando        | Resultado                                  |
| -------------- | ------------------------------------------ |
| `npm run lint` | ✓ sin avisos                               |
| `npm run typecheck` | ✓ estricto, sin errores             |
| `npm run test` | ✓ 58/58 (27 booking + 17 schedule + 10 settings nuevos/casos + 4 env) |
| `npm run build`| ✓ `/`, `/reservar`, `/admin/horarios`, `/admin/ajustes` dinámicos (ƒ) |
| `npm run test:db` | ✓ 28/28 (incluye las 6 comprobaciones nuevas de `anon`) |
| `npm run format:check` | ✓ Prettier limpio               |

Tests añadidos por QA (única carpeta editada junto a `docs/qa/**`):

- `tests/unit/schedule.test.ts` (17): `parseWorkingHours` (7 días lunes→domingo,
  `"08:00:00"`→`"08:00"`, días vacíos, filas malformadas descartadas, tramos
  ordenados), `parseAdminTimeOffs` (orden por `startsAt`, `reason: null`,
  malformadas), `parseTimeOffConflicts` (estructura, jsonb `[]`),
  `parseTimeOffCreation` (`created` true/false, sin id al no crear, forma
  inválida → `null`), `formatTimeOffRange`.
- `tests/unit/settings.test.ts` (10): `parseAdminBusinessSettings` (select
  directo con `id`, data sin `.single()`, dirección `null`),
  `parseUpdatedBusinessSettings` (columna `business_id`, rechaza `id`, exige
  arreglo de la RPC), `parseUpdatedServicePrice`.
- `tests/unit/booking.test.ts` (+3): `crLocalToIsoUtc` —
  `"2026-11-26"+"08:00"` → `"2026-11-26T14:00:00.000Z"`;
  `"24:00"` avanza un día; `"2026-12-31"+"24:00"` → `"2027-01-01T06:00:00.000Z"`
  (cruce de año); bisiesto `"2028-02-28"+"24:00"` → `"2028-02-29T06:00:00.000Z"`;
  entradas basura → `null`.

## Auditoría de seguridad (SQL)

- Las 6 RPC nuevas son `security definer` con `set search_path = public, pg_temp`
  y resuelven el barbero con `barbers.auth_user_id = auth.uid()`; sin vínculo
  responden `NOT_AUTHENTICATED`. ✓
- Validaciones antes de los casts: `admin_set_working_hours` valida con regexp
  `^([01][0-9]|2[0-3]):[03]0$` antes de `::time` (línea 157). ✓
- `revoke ... from public, anon` + `grant ... to authenticated` en las 6
  (líneas 527–539). El smoke test ejecuta las 6 como `anon` y todas quedan
  rechazadas. ✓
- `conflicts` jsonb (nombres y teléfonos) solo sale por
  `admin_create_time_off`, autenticada y filtrada por barbero propio. `anon`
  no tiene `select` sobre `time_off` ni `appointments` (fase 1.1 intacta). ✓
- Idempotente: `create or replace function`, `do $$ ... duplicate_object` para
  el tipo `timerange` y los dos constraints, `create extension if not exists`,
  `notify pgrst, 'reload schema'`. ✓
- `time_subtype_diff` es `immutable`, sin `security definer` (no lo necesita).

## Auditoría de lógica

- Anti-solape de `working_hours`: `exclude using gist` con `timerange` +
  `btree_gist`; `admin_set_working_hours` captura `exclusion_violation` y
  responde `RANGES_OVERLAP`; el `delete` + `insert` es atómico (el bloque de
  excepciones revierte también el delete). ✓
- `admin_create_time_off`: sin `p_force` y con citas confirmadas solapadas NO
  inserta nada (`created=false`, `time_off_id=null`) y devuelve los conflictos;
  con `p_force` inserta y devuelve los mismos conflictos. El `forzar=1` de la
  UI reenvía exactamente lo que el usuario escribió. ✓
- `[]` en `admin_set_working_hours` borra los tramos del día →
  `get_available_slots` (que filtra por `working_hours.weekday`) deja de
  devolver espacios y `book_appointment` rechaza fuera de horario. La acción
  ignora pares vacíos, así que el editor con "—" en todas las filas cierra el
  día. ✓
- Coherencia acción ↔ BD: `setWorkingHoursAction` valida forma/alineación/
  solape/máx. 4 y la BD repite todo (la BD manda); `createTimeOffAction`
  valida fecha/horas/motivo y la BD añade `TIME_OFF_IN_THE_PAST`;
  `updateBusinessSettingsAction` usa la misma normalización de teléfono que
  `normalize_cr_phone`; `updateServicePriceAction` ₡0–100.000 = 0–10.000.000
  centavos. `INVALID_PHONE` y `SERVICE_NOT_FOUND` ya estaban mapeados en
  `admin-state.ts`. ✓
- Las cinco reglas de reserva siguen intactas (smoke 28/28): bloques de 30 min
  alineados, descanso, <1 h, >30 días, doble reserva simultánea, `anon` sin
  citas ni teléfonos. ✓

## Mobile-first (revisión de código a 360 px)

- Nav del panel con `flex-wrap` (no desborda con 4 enlaces). Botones
  `min-h-12` (48 px). Inputs `text-base` (sin zoom en iOS).
- `label htmlFor` en cada campo; `role="alert"` en errores/avisos y
  `role="status"` en éxitos; `aria-invalid` solo cuando aplica.
- Selects con opciones renderizadas desde el servidor (`HALF_HOUR_OPTIONS`):
  los formularios sirven sin JavaScript. Nada depende de `hover`.

## Hallazgos

### Bloqueantes

Ninguno.

### Importantes

Ninguno.

### Menores

1. `src/lib/settings.ts:34-40` — `parseSettingsRow` acepta cualquier cadena
   como id (no valida UUID), a diferencia del resto de `admin-data.ts`
   (`isUuid`). Los datos vienen de un select propio a la BD, así que no es
   explotable; es solo una tolerancia inconsistente. Cubierto por test que
   documenta el comportamiento actual.
2. El editor de horarios no avisa cuando el día que se cierra tiene citas
   confirmadas en fechas futuras (los bloqueos sí avisan). Los criterios de la
   fase solo exigen el aviso para bloqueos; las citas siguen visibles en la
   agenda. Sugerido para Fase 1.6.
3. `TimeOffForm` solo admite bloqueos de un mismo día (fecha + fin/24:00); el
   modelo soporta rangos multidia, pero habría que crear uno por día. No
   viola ningún criterio.
4. `admin_list_time_off` solo devuelve bloqueos vigentes (`ends_at > now()`):
   los pasados no se ven ni se pueden borrar desde el panel (son inertes).
5. `working_hours` no puede terminar en `24:00` (tipo `time`); el límite real
   es 23:30. El "Fin del día" existe solo para bloqueos. Limitación de modelo
   asumida, no introduce error.
6. Doble envío simultáneo del mismo bloqueo crea dos filas (no hay constraint
   de exclusión en `time_off`). No afecta a citas ni disponibilidad; se
   pueden quitar de la lista una por una.

## Criterios verificados

- [x] Editor de horarios por día con varios tramos — automático: SQL, acciones
      y UI auditadas; parsers con tests. **Manual pendiente:** guardar un día
      con dos tramos y verlo reflejado.
- [x] CRUD de bloqueos con aviso si hay cita en el rango — automático: flujo
      `conflicts`/`p_force` auditado y probado en unit; `anon` bloqueado.
      **Manual pendiente:** crear un bloqueo sobre una cita real y ver el
      aviso, luego quitarlo de la lista.
- [x] Ajustes del negocio (nombre, WhatsApp, dirección, precio) — automático:
      RPC y acciones validan lo mismo; parsers con tests. **Manual
      pendiente:** cambiar nombre/WhatsApp/precio con la sesión real del
      barbero y ver la portada al instante.
- [x] Cerrar un día oculta los espacios — automático (cadena): `[]` borra los
      tramos, `get_available_slots` filtra por weekday, `/reservar` dinámico;
      el smoke ya prueba el miércoles cerrado. **Manual pendiente:** cerrar un
      día hábil y recargar `/reservar`.
- [x] Cambios sin deploy — automático: `/`, `/reservar`, `/admin/horarios` y
      `/admin/ajustes` son ƒ (dinámicos) + `revalidatePath` en las acciones.

## Nota sobre e2e

No se añadieron tests Playwright: el runner no existe todavía (e2e está
planificado para Fase 1.6 en `docs/plan.md`) y montarlo requeriría tocar
configuración y dependencias, fuera del alcance de QA. La cobertura de esta
fase quedó en tests unitarios + smoke de BD + verificación manual.

## Pendiente de verificación manual (sesión real del barbero)

1. Cerrar un día hábil en `/admin/horarios` y recargar `/reservar`: el día
   desaparece de la tira y no se puede reservar.
2. Crear un bloqueo sobre una cita confirmada: ver el aviso con nombre,
   teléfono y horario; "Crear bloqueo de todos modos" lo crea; la cita sigue
   en la agenda; quitar el bloqueo lo borra.
3. Cambiar nombre, WhatsApp, dirección y precio en `/admin/ajustes` y ver la
   portada y `/reservar` actualizadas al instante, sin deploy.
4. Repetir el flujo completo en un celular a 360 px.
