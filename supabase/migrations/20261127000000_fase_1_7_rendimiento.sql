-- ============================================================================
-- Fase 1.7 · Rendimiento: índices de FK, RLS con initplan y search_path fijo
--
-- Aplicar en Supabase → SQL Editor → New query → Run, después de las
-- migraciones de las fases 1.1 a 1.5. Es idempotente: se puede ejecutar varias
-- veces sin duplicar nada.
--
-- Convierte en SQL los hallazgos de los advisors de Supabase de rendimiento
-- (y dos de seguridad de bajo riesgo). No cambia ningún contrato: quién puede
-- ver/escribir qué sigue exactamente igual.
--
-- Contenido:
--   1. Índices para las FKs sin índice (`unindexed_foreign_keys`)
--   2. RLS: `(select auth.uid())` para que el planificador lo evalúe una sola
--      vez por sentencia (`auth_rls_initplan`) y reducción del doble filtro
--      permisivo de `working_hours` para SELECT de authenticated
--   3. `search_path` fijo en `set_updated_at` y `normalize_cr_phone`
--      (`function_search_path_mutable`)
--
-- Pendiente fuera de alcance (no se toca aquí):
--   · Mover la extensión `btree_gist` fuera de `public` (y con ella las
--     funciones de `timerange`/`timemultirange`): cambio con riesgo, se anota
--     para una fase posterior.
--   · "Leaked password protection" de Auth: es un ajuste del dashboard de
--     Supabase, no se resuelve con SQL.
-- ============================================================================

set search_path = public, extensions, pg_temp;

-- ============================================================================
-- 1. Índices para las FKs sin índice
-- ============================================================================
--
-- Postgres no crea índices automáticamente sobre columnas FK. Sin índice, los
-- JOIN por esa columna y, sobre todo, los `on delete cascade` (que borran las
-- filas hijas cuando desaparece la fila padre) tienen que recorrer la tabla
-- entera. Estas tablas son chicas hoy, pero el advisor los marca como FK sin
-- índice y cuesta poco dejarlos cubiertos.
--
-- No se borra ningún índice existente (aunque el advisor los catalogue de
-- "unused" por ser tablas pequeñas): se conservan tal cual.

-- FK compuesta (barber_id, business_id) -> barbers(id, business_id).
-- Cubre el cascade al borrar un barbero y la consulta por barbero+negocio.
create index if not exists appointments_barber_business_idx
  on public.appointments (barber_id, business_id);

-- FK business_id -> businesses(id). Cubre el cascade al borrar un negocio.
-- No la cubre ningún índice previo: (barber_id, starts_at) no ayuda y el
-- índice (barber_id, business_id) de arriba solo sirve por el prefijo barber_id.
create index if not exists appointments_business_idx
  on public.appointments (business_id);

-- FK compuesta (service_id, business_id) -> services(id, business_id).
-- Cubre el cascade al borrar un servicio y la consulta por servicio+negocio.
create index if not exists appointments_service_business_idx
  on public.appointments (service_id, business_id);

-- FK business_id -> businesses(id) en barbers. El unique (id, business_id)
-- existente no cubre business_id en solitario; hace falta para el cascade.
create index if not exists barbers_business_idx
  on public.barbers (business_id);

-- FK business_id -> businesses(id) en services. Igual que barbers: el
-- unique (id, business_id) no cubre business_id en solitario.
create index if not exists services_business_idx
  on public.services (business_id);

-- ============================================================================
-- 2. RLS: initplan y reducción del doble filtro de working_hours
-- ============================================================================
--
-- En las políticas que llaman `auth.uid()` directamente, Postgres puede llegar
-- a evaluar la función una vez por fila (o como subconsulta correlacionada).
-- Envolverla en `(select auth.uid())` la convierte en un initplan: el
-- planificador la ejecuta una sola vez por sentencia y reutiliza el valor
-- (https://supabase.com/docs/guides/database/postgres/row-level-security).
-- Es seguro porque `auth.uid()` no depende de la fila.
--
-- Se recrean las políticas con la MISMA semántica (mismos roles y comandos);
-- solo cambia la forma de evaluar `auth.uid()`.

-- barbers ---------------------------------------------------------------

drop policy if exists barbers_owner_read on public.barbers;
create policy barbers_owner_read on public.barbers
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

drop policy if exists barbers_owner_update on public.barbers;
create policy barbers_owner_update on public.barbers
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- working_hours -----------------------------------------------------------
--
-- Además del initplan, se reduce el doble filtro permisivo para SELECT de
-- authenticated. `working_hours_public_read` ya permite SELECT a anon y
-- authenticated con `using (true)`, así que la parte de SELECT del antiguo
-- `working_hours_owner_all` era redundante (se aplicaba en OR con un `true`).
-- Se separa en tres políticas (insert/update/delete) conservando exactamente
-- el mismo control de propiedad; SELECT queda cubierto solo por la pública.

drop policy if exists working_hours_owner_all on public.working_hours;
drop policy if exists working_hours_owner_insert on public.working_hours;
drop policy if exists working_hours_owner_update on public.working_hours;
drop policy if exists working_hours_owner_delete on public.working_hours;

create policy working_hours_owner_insert on public.working_hours
  for insert to authenticated
  with check (exists (
    select 1 from public.barbers b
    where b.id = working_hours.barber_id
      and b.auth_user_id = (select auth.uid())
  ));

create policy working_hours_owner_update on public.working_hours
  for update to authenticated
  using (exists (
    select 1 from public.barbers b
    where b.id = working_hours.barber_id
      and b.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.barbers b
    where b.id = working_hours.barber_id
      and b.auth_user_id = (select auth.uid())
  ));

create policy working_hours_owner_delete on public.working_hours
  for delete to authenticated
  using (exists (
    select 1 from public.barbers b
    where b.id = working_hours.barber_id
      and b.auth_user_id = (select auth.uid())
  ));

-- time_off ---------------------------------------------------------------

drop policy if exists time_off_owner_all on public.time_off;
create policy time_off_owner_all on public.time_off
  for all to authenticated
  using (exists (
    select 1 from public.barbers b
    where b.id = time_off.barber_id
      and b.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.barbers b
    where b.id = time_off.barber_id
      and b.auth_user_id = (select auth.uid())
  ));

-- appointments -----------------------------------------------------------

drop policy if exists appointments_owner_select on public.appointments;
create policy appointments_owner_select on public.appointments
  for select to authenticated
  using (exists (
    select 1 from public.barbers b
    where b.id = appointments.barber_id
      and b.auth_user_id = (select auth.uid())
  ));

drop policy if exists appointments_owner_insert on public.appointments;
create policy appointments_owner_insert on public.appointments
  for insert to authenticated
  with check (exists (
    select 1 from public.barbers b
    where b.id = appointments.barber_id
      and b.auth_user_id = (select auth.uid())
  ));

drop policy if exists appointments_owner_update on public.appointments;
create policy appointments_owner_update on public.appointments
  for update to authenticated
  using (exists (
    select 1 from public.barbers b
    where b.id = appointments.barber_id
      and b.auth_user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.barbers b
    where b.id = appointments.barber_id
      and b.auth_user_id = (select auth.uid())
  ));

-- ============================================================================
-- 3. search_path fijo en funciones propias sin definer
-- ============================================================================
--
-- `function_search_path_mutable` marca las funciones que no fijan su
-- `search_path`: Postgres resuelve los nombres con el `search_path` de quien
-- llama, lo que es un riesgo de "search_path hijacking" y algo menos eficiente.
-- Estas dos funciones no son `security definer` (no traen privilegios extra),
-- pero conviene fijarles el path. No hace falta `create or replace`: `alter
-- function ... set` es idempotente.

alter function public.set_updated_at()
  set search_path = pg_catalog, public;

alter function public.normalize_cr_phone(text)
  set search_path = pg_catalog, public;

-- Refresca el esquema que PostgREST mantiene en caché.
notify pgrst, 'reload schema';
