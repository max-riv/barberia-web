# Esquema actual (Fase 1.3)

Resumen para no tener que releer todas las migraciones. La fuente de verdad son
los archivos de `supabase/migrations/`.

## IDs del seed (Charlie's Barbershop)

| Entidad  | ID                                     |
| -------- | -------------------------------------- |
| business | `00000000-0000-4000-8000-000000000001` |
| barber   | `00000000-0000-4000-8000-000000000002` |
| service  | `00000000-0000-4000-8000-000000000003` |

Negocio: `America/Costa_Rica`, WhatsApp `+50687677997`, moneda `CRC`.
Servicio: corte, 30 min, ₡6.000 (`price_cents = 600000`).
Horario: lunes, martes, jueves, viernes, sábado y domingo de 08:00–12:00 y
13:00–18:00; miércoles cerrado.

## Enum

`public.appointment_status`: `confirmed`, `cancelled`, `completed`, `no_show`.

## Tablas

| Tabla           | Columnas relevantes                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `businesses`    | `id`, `name`, `slug`, `timezone`, `whatsapp_phone`, `address`, `currency char(3)`                                                                   |
| `barbers`       | `id`, `business_id`, `auth_user_id` (nullable, unique), `display_name`, `active`                                                                    |
| `services`      | `id`, `business_id`, `name`, `duration_minutes`, `price_cents`, `active`                                                                            |
| `working_hours` | `id`, `barber_id`, `weekday` (0–6), `start_time`, `end_time`                                                                                        |
| `time_off`      | `id`, `barber_id`, `starts_at`, `ends_at`, `reason`                                                                                                 |
| `appointments`  | `id`, `business_id`, `barber_id`, `service_id`, `customer_name`, `customer_phone`, `starts_at`, `ends_at`, `status`, `cancel_token`, `cancelled_at` |

`barbers.auth_user_id` está nulo en el seed: hay que vincularlo cuando se cree el
usuario de Supabase Auth (Fase 1.4).

## Anti-doble-reserva

```sql
constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed'::public.appointment_status)
```

Requiere `btree_gist`. La segunda reserva falla con SQLSTATE `23P01`; las
funciones lo traducen a `SLOT_TAKEN`.

## RPC públicas

Todas son `security definer`, `search_path = public, pg_temp`, y ejecutables por
`anon` y `authenticated` salvo que se indique.

| Función                    | Parámetros                                                                                                          | Devuelve                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_available_slots`      | `p_barber_id uuid`, `p_date date`                                                                                   | `slot_start timestamptz`, `slot_end timestamptz`                                                                                                                                                                                                                  |
| `book_appointment`         | `p_barber_id uuid`, `p_service_id uuid`, `p_starts_at timestamptz`, `p_customer_name text`, `p_customer_phone text` | `appointment_id uuid`, `cancel_token uuid`, `starts_at`, `ends_at`                                                                                                                                                                                                |
| `cancel_appointment`       | `p_token uuid`                                                                                                      | `status appointment_status`, `starts_at timestamptz`                                                                                                                                                                                                              |
| `get_appointment_by_token` | `p_token uuid`                                                                                                      | `appointment_id`, `status`, `starts_at`, `ends_at`, `customer_name`, `customer_phone`, `service_name`, `service_duration_minutes`, `service_price_cents`, `business_name`, `business_whatsapp`, `business_address`, `business_currency text`, `business_timezone` |

`normalize_cr_phone(text)` es interna: no tiene `grant` para el público.

## Códigos de error de negocio (`P0001`)

| Código                        | Cuándo                                                  |
| ----------------------------- | ------------------------------------------------------- |
| `SLOT_TAKEN`                  | Solape o doble reserva simultánea                       |
| `SLOT_TOO_SOON`               | Menos de 1 hora de antelación                           |
| `SLOT_TOO_FAR`                | Más de 30 días hacia adelante                           |
| `SLOT_NOT_ALIGNED`            | Inicio no alineado a :00 o :30                          |
| `SLOT_OUTSIDE_WORKING_HOURS`  | Fuera de horario o día cerrado                          |
| `SLOT_BLOCKED`                | Dentro de un `time_off`                                 |
| `INVALID_NAME`                | Nombre fuera de 2–80 caracteres                         |
| `INVALID_PHONE`               | Teléfono no normalizable a E.164 de Costa Rica          |
| `TOO_MANY_APPOINTMENTS`       | 3 o más citas futuras confirmadas con el mismo teléfono |
| `BARBER_NOT_FOUND`            | Barbero inexistente o inactivo                          |
| `SERVICE_NOT_FOUND`           | Servicio inexistente o inactivo                         |
| `APPOINTMENT_NOT_FOUND`       | Token desconocido                                       |
| `APPOINTMENT_NOT_CANCELLABLE` | La cita no está confirmada                              |
| `CANCELLATION_TOO_LATE`       | La cita ya empezó                                       |

## Acceso

- `anon`: `select` en `businesses`, `services`, `working_hours` y columnas no
  sensibles de `barbers`; ejecuta las RPC. **No** lee `appointments` ni
  `time_off`.
- `authenticated`: además puede operar sobre sus propias citas; las políticas
  RLS comparan `barbers.auth_user_id = auth.uid()`.

## Migraciones existentes

| Archivo                                                    | Contenido                                             |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| `20261115000000_fase_1_1.sql`                              | Tablas, enum, constraint, RPC base, RLS, grants, seed |
| `20261115000001_fase_1_2_limite_citas.sql`                 | `book_appointment` con límite de 3 citas por teléfono |
| `20261121000000_fase_1_3_consulta_cita.sql`                | `get_appointment_by_token`                            |
| `20261121000001_fix_get_appointment_by_token_currency.sql` | Cast `currency::text` para corregir el 42804          |
