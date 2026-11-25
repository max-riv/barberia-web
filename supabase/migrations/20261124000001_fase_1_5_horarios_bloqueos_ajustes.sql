-- ============================================================================
-- Fase 1.5 · Horarios, descansos y bloqueos + ajustes del negocio
--
-- Aplicar en Supabase → SQL Editor → New query → Run, después de las
-- migraciones de las fases 1.1 a 1.4. Es idempotente.
--
-- El barbero se sigue resolviendo con `barbers.auth_user_id = auth.uid()`;
-- sin vínculo, todas las funciones responden `NOT_AUTHENTICATED`.
--
-- Contenido:
--   1. Tipo de rango `timerange` y constraints de `working_hours`
--      (sin solapes y alineación a :00/:30)
--   2. Editor de horarios por día (`admin_set_working_hours`)
--   3. Bloqueos con aviso de citas en el rango (`admin_create_time_off`,
--      `admin_list_time_off`, `admin_delete_time_off`)
--   4. Ajustes del negocio y precios (`admin_update_business_settings`,
--      `admin_update_service_price`)
--   5. Permisos: solo `authenticated`
-- ============================================================================

set search_path = public, extensions, pg_temp;

-- btree_gist da el soporte GiST de `=` para uuid y smallint que usa el
-- constraint de exclusión de abajo (la fase 1.1 ya lo instala; esto es
-- idempotente).
create extension if not exists btree_gist;

-- La garantía anti-solape de `working_hours` compara rangos sobre `time`.
-- Postgres no trae un tipo de rango para horas: se define aquí, con el
-- `subtype_diff` que recomienda la documentación para rangos indexados con
-- GiST (lo usa el constraint de exclusión de abajo).
create or replace function public.time_subtype_diff(x time, y time)
returns float8
language sql
immutable
strict
as $$
  select extract(epoch from (x - y))
$$;

do $$
begin
  create type public.timerange as range (
    subtype = time,
    subtype_diff = public.time_subtype_diff
  );
exception
  when duplicate_object then null;
end $$;

-- ============================================================================
-- 1. Constraints de working_hours
-- ============================================================================

-- Dos tramos del mismo barbero en el mismo día no pueden solaparse, ni
-- siquiera con ediciones simultáneas desde el panel. Misma técnica que
-- `appointments_no_overlap`: el constraint es la fuente de verdad, no un
-- SELECT previo. Postgres rechaza la segunda escritura con 23P01.
do $$
begin
  alter table public.working_hours
    add constraint working_hours_no_overlap
    exclude using gist (
      barber_id with =,
      weekday with =,
      timerange(start_time, end_time, '[)') with &&
    );
exception
  when duplicate_object then null;
end $$;

-- Los tramos empiezan y terminan en punto o y media, sin segundos.
-- El seed actual (08:00, 12:00, 13:00, 18:00) ya cumple.
do $$
begin
  alter table public.working_hours
    add constraint working_hours_alignment_check
    check (
      (
        extract(second from start_time)::integer = 0
        and extract(minute from start_time)::integer in (0, 30)
      )
      and (
        extract(second from end_time)::integer = 0
        and extract(minute from end_time)::integer in (0, 30)
      )
    );
exception
  when duplicate_object then null;
end $$;

-- ============================================================================
-- 2. Editor de horarios por día
-- ============================================================================

-- Reemplaza todos los tramos de un día de la semana. `p_ranges` es un
-- arreglo JSON de objetos {"start": "HH:MM", "end": "HH:MM"} alineados a
-- :00/:30; `[]` cierra el día (borra sus tramos).
-- Errores de negocio (SQLSTATE P0001):
--   NOT_AUTHENTICATED | INVALID_WEEKDAY | INVALID_RANGES | RANGES_OVERLAP
create or replace function public.admin_set_working_hours(
  p_weekday smallint,
  p_ranges  jsonb
)
returns table (
  weekday    smallint,
  start_time time,
  end_time   time
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_barber_id uuid;
  v_range     jsonb;
  v_start     text;
  v_end       text;
begin
  select br.id
    into v_barber_id
  from public.barbers br
  where br.auth_user_id = auth.uid()
    and br.active;

  if v_barber_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_weekday is null or p_weekday < 0 or p_weekday > 6 then
    raise exception 'INVALID_WEEKDAY' using errcode = 'P0001';
  end if;

  if p_ranges is null or jsonb_typeof(p_ranges) <> 'array' then
    raise exception 'INVALID_RANGES' using errcode = 'P0001';
  end if;

  if jsonb_array_length(p_ranges) > 4 then
    raise exception 'INVALID_RANGES' using errcode = 'P0001';
  end if;

  -- Primero el formato (regexp) y después el cast a `time`: un valor basura
  -- no debe reventar el cast.
  for v_range in
    select value from jsonb_array_elements(p_ranges)
  loop
    if jsonb_typeof(v_range) is distinct from 'object' then
      raise exception 'INVALID_RANGES' using errcode = 'P0001';
    end if;

    v_start := v_range->>'start';
    v_end   := v_range->>'end';

    if v_start is null
      or v_end is null
      or v_start !~ '^([01][0-9]|2[0-3]):[03]0$'
      or v_end !~ '^([01][0-9]|2[0-3]):[03]0$' then
      raise exception 'INVALID_RANGES' using errcode = 'P0001';
    end if;

    if v_start::time >= v_end::time then
      raise exception 'INVALID_RANGES' using errcode = 'P0001';
    end if;
  end loop;

  -- Solapes dentro del propio arreglo: se detectan aquí y, por si dos
  -- ediciones corren a la vez, también al insertar (exclusion_violation).
  if exists (
    select 1
    from jsonb_array_elements(p_ranges) with ordinality as a(value, ord),
         jsonb_array_elements(p_ranges) with ordinality as b(value, ord)
    where a.ord < b.ord
      and (a.value->>'start')::time < (b.value->>'end')::time
      and (b.value->>'start')::time < (a.value->>'end')::time
  ) then
    raise exception 'RANGES_OVERLAP' using errcode = 'P0001';
  end if;

  -- Atómico: o el día queda con sus tramos nuevos completos o no se toca
  -- nada (el bloque de excepción revierte también el delete).
  begin
    delete from public.working_hours
     where barber_id = v_barber_id
       and weekday = p_weekday;

    return query
    insert into public.working_hours (barber_id, weekday, start_time, end_time)
    select
      v_barber_id,
      p_weekday,
      (r.value->>'start')::time,
      (r.value->>'end')::time
    from jsonb_array_elements(p_ranges) as r(value)
    returning weekday, start_time, end_time;
  exception
    when exclusion_violation or unique_violation then
      raise exception 'RANGES_OVERLAP' using errcode = 'P0001';
  end;
end;
$$;

-- ============================================================================
-- 3. Bloqueos (time_off) con aviso de citas en el rango
-- ============================================================================

-- Crea un bloqueo. Si hay citas confirmadas dentro del rango y no se fuerza,
-- NO crea nada y devuelve la lista de conflictos para que el panel decida.
-- El arreglo de conflictos se calcula siempre, cree o no el bloqueo.
-- Errores de negocio (SQLSTATE P0001):
--   NOT_AUTHENTICATED | TIME_OFF_INVALID | TIME_OFF_IN_THE_PAST
--   | INVALID_REASON
create or replace function public.admin_create_time_off(
  p_starts_at timestamptz,
  p_ends_at   timestamptz,
  p_reason    text,
  p_force     boolean default false
)
returns table (
  time_off_id uuid,
  created     boolean,
  conflicts   jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_barber_id uuid;
  v_reason    text;
  v_conflicts jsonb;
  v_id        uuid;
begin
  select br.id
    into v_barber_id
  from public.barbers br
  where br.auth_user_id = auth.uid()
    and br.active;

  if v_barber_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'TIME_OFF_INVALID' using errcode = 'P0001';
  end if;

  if p_ends_at <= now() then
    raise exception 'TIME_OFF_IN_THE_PAST' using errcode = 'P0001';
  end if;

  v_reason := btrim(coalesce(p_reason, ''));

  if char_length(v_reason) > 120 then
    raise exception 'INVALID_REASON' using errcode = 'P0001';
  end if;

  if v_reason = '' then
    v_reason := null;
  end if;

  -- Citas confirmadas que chocan con el bloqueo, ordenadas por inicio.
  -- Las fechas van en ISO UTC fijo (to_char) para que el jsonb no dependa
  -- de la zona horaria de la sesión que ejecute la función.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'starts_at',
        to_char(a.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'ends_at',
        to_char(a.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'customer_name', a.customer_name,
        'customer_phone', a.customer_phone
      )
      order by a.starts_at
    ),
    '[]'::jsonb
  )
    into v_conflicts
  from public.appointments a
  where a.barber_id = v_barber_id
    and a.status = 'confirmed'
    and tstzrange(a.starts_at, a.ends_at, '[)')
        && tstzrange(p_starts_at, p_ends_at, '[)');

  if v_conflicts is null then
    v_conflicts := '[]'::jsonb;
  end if;

  if coalesce(p_force, false) or v_conflicts = '[]'::jsonb then
    insert into public.time_off (barber_id, starts_at, ends_at, reason)
    values (v_barber_id, p_starts_at, p_ends_at, v_reason)
    returning id into v_id;

    return query select v_id, true, v_conflicts;
  else
    return query select null::uuid, false, v_conflicts;
  end if;
end;
$$;

-- Bloqueos vigentes del barbero (los que aún no terminan) con cuántas citas
-- confirmadas caen dentro de cada uno. `reason` puede ser null y la fila se
-- devuelve igual.
create or replace function public.admin_list_time_off()
returns table (
  time_off_id       uuid,
  starts_at         timestamptz,
  ends_at           timestamptz,
  reason            text,
  appointment_count integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_barber_id uuid;
begin
  select br.id
    into v_barber_id
  from public.barbers br
  where br.auth_user_id = auth.uid()
    and br.active;

  if v_barber_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  return query
  select
    t.id,
    t.starts_at,
    t.ends_at,
    t.reason,
    (
      select count(*)
      from public.appointments a
      where a.barber_id = v_barber_id
        and a.status = 'confirmed'
        and tstzrange(a.starts_at, a.ends_at, '[)')
            && tstzrange(t.starts_at, t.ends_at, '[)')
    )::integer
  from public.time_off t
  where t.barber_id = v_barber_id
    and t.ends_at > now()
  order by t.starts_at;
end;
$$;

-- Borra un bloqueo propio. Si no existe o es de otro barbero se responde
-- igual: `TIME_OFF_NOT_FOUND` (no se filtra su existencia).
create or replace function public.admin_delete_time_off(p_time_off_id uuid)
returns table (
  time_off_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_barber_id uuid;
  v_id        uuid;
begin
  select br.id
    into v_barber_id
  from public.barbers br
  where br.auth_user_id = auth.uid()
    and br.active;

  if v_barber_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  delete from public.time_off
   where id = p_time_off_id
     and barber_id = v_barber_id
  returning id into v_id;

  if v_id is null then
    raise exception 'TIME_OFF_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query select v_id;
end;
$$;

-- ============================================================================
-- 4. Ajustes del negocio y precios
-- ============================================================================

-- Actualiza nombre, WhatsApp y dirección del negocio del barbero autenticado.
-- Errores de negocio (SQLSTATE P0001):
--   NOT_AUTHENTICATED | INVALID_BUSINESS_NAME | INVALID_PHONE
--   | INVALID_ADDRESS
create or replace function public.admin_update_business_settings(
  p_name           text,
  p_whatsapp_phone text,
  p_address        text
)
returns table (
  business_id    uuid,
  name           text,
  whatsapp_phone text,
  address        text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_barber_id   uuid;
  v_business_id uuid;
  v_name        text;
  v_phone       text;
  v_address     text;
begin
  select br.id, br.business_id
    into v_barber_id, v_business_id
  from public.barbers br
  where br.auth_user_id = auth.uid()
    and br.active;

  if v_barber_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  v_name := btrim(coalesce(p_name, ''));

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'INVALID_BUSINESS_NAME' using errcode = 'P0001';
  end if;

  v_phone := public.normalize_cr_phone(p_whatsapp_phone);

  if v_phone is null then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;

  v_address := btrim(coalesce(p_address, ''));

  if char_length(v_address) > 200 then
    raise exception 'INVALID_ADDRESS' using errcode = 'P0001';
  end if;

  if v_address = '' then
    v_address := null;
  end if;

  return query
  update public.businesses b
     set name = v_name,
         whatsapp_phone = v_phone,
         address = v_address
   where b.id = v_business_id
  returning b.id, b.name, b.whatsapp_phone, b.address;
end;
$$;

-- Cambia el precio de un servicio activo del negocio del barbero, en
-- centavos (₡100.000 = 10_000_000). El precio no puede ser negativo.
-- Errores de negocio (SQLSTATE P0001):
--   NOT_AUTHENTICATED | SERVICE_NOT_FOUND | INVALID_PRICE
create or replace function public.admin_update_service_price(
  p_service_id  uuid,
  p_price_cents integer
)
returns table (
  service_id  uuid,
  name        text,
  price_cents integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_barber_id   uuid;
  v_business_id uuid;
begin
  select br.id, br.business_id
    into v_barber_id, v_business_id
  from public.barbers br
  where br.auth_user_id = auth.uid()
    and br.active;

  if v_barber_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.services s
    where s.id = p_service_id
      and s.business_id = v_business_id
      and s.active
  ) then
    raise exception 'SERVICE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_price_cents is null
    or p_price_cents < 0
    or p_price_cents > 10000000 then
    raise exception 'INVALID_PRICE' using errcode = 'P0001';
  end if;

  return query
  update public.services s
     set price_cents = p_price_cents
   where s.id = p_service_id
     and s.business_id = v_business_id
     and s.active
  returning s.id, s.name, s.price_cents;
end;
$$;

-- ============================================================================
-- 5. Permisos: solo el barbero autenticado
-- ============================================================================

revoke all on function public.admin_set_working_hours(smallint, jsonb) from public, anon;
revoke all on function public.admin_create_time_off(timestamptz, timestamptz, text, boolean) from public, anon;
revoke all on function public.admin_list_time_off() from public, anon;
revoke all on function public.admin_delete_time_off(uuid) from public, anon;
revoke all on function public.admin_update_business_settings(text, text, text) from public, anon;
revoke all on function public.admin_update_service_price(uuid, integer) from public, anon;

grant execute on function public.admin_set_working_hours(smallint, jsonb) to authenticated;
grant execute on function public.admin_create_time_off(timestamptz, timestamptz, text, boolean) to authenticated;
grant execute on function public.admin_list_time_off() to authenticated;
grant execute on function public.admin_delete_time_off(uuid) to authenticated;
grant execute on function public.admin_update_business_settings(text, text, text) to authenticated;
grant execute on function public.admin_update_service_price(uuid, integer) to authenticated;

-- Refresca el esquema que PostgREST mantiene en caché.
notify pgrst, 'reload schema';
