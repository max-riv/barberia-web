-- ============================================================================
-- Fase 1.4 · Login y panel del barbero
--
-- Aplicar en Supabase → SQL Editor → New query → Run, después de las
-- migraciones de las fases 1.1, 1.2 y 1.3. Es idempotente.
--
-- El barbero se identifica por `barbers.auth_user_id = auth.uid()`. El vínculo
-- se hace una sola vez de forma manual (Etapa 2); mientras no exista, todas las
-- funciones responden `NOT_AUTHENTICATED`.
--
-- Contenido:
--   1. Agenda y detalle de citas
--   2. Espacios para citas manuales (sin la regla de 1 hora)
--   3. Alta manual de citas (walk-in)
--   4. Cambio libre de estado
--   5. Permisos: solo `authenticated`
-- ============================================================================

set search_path = public, extensions, pg_temp;

-- ============================================================================
-- 1. Agenda y detalle de citas
-- ============================================================================

-- Citas del barbero autenticado entre dos fechas locales inclusivas
-- (America/Costa_Rica, la zona del negocio).
create or replace function public.admin_get_agenda(
  p_from date,
  p_to   date
)
returns table (
  appointment_id           uuid,
  status                   public.appointment_status,
  starts_at                timestamptz,
  ends_at                  timestamptz,
  customer_name            text,
  customer_phone           text,
  service_id               uuid,
  service_name             text,
  service_duration_minutes integer,
  service_price_cents      integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_barber_id uuid;
  v_timezone  text;
  v_from      timestamptz;
  v_to        timestamptz;
begin
  select br.id, b.timezone
    into v_barber_id, v_timezone
  from public.barbers br
  join public.businesses b on b.id = br.business_id
  where br.auth_user_id = auth.uid()
    and br.active;

  if v_barber_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    return;
  end if;

  -- Rango inclusivo de fechas locales: [p_from 00:00, p_to+1 00:00).
  v_from := (p_from::timestamp) at time zone v_timezone;
  v_to   := ((p_to + 1)::timestamp) at time zone v_timezone;

  return query
  select
    a.id,
    a.status,
    a.starts_at,
    a.ends_at,
    a.customer_name,
    a.customer_phone,
    s.id,
    s.name,
    s.duration_minutes,
    s.price_cents
  from public.appointments a
  join public.services s on s.id = a.service_id
  where a.barber_id = v_barber_id
    and a.starts_at >= v_from
    and a.starts_at < v_to
  order by a.starts_at;
end;
$$;

-- Una sola cita del barbero autenticado. Si no existe o es de otro barbero,
-- se responde igual: `APPOINTMENT_NOT_FOUND` (no se filtra su existencia).
create or replace function public.admin_get_appointment(
  p_appointment_id uuid
)
returns table (
  appointment_id           uuid,
  status                   public.appointment_status,
  starts_at                timestamptz,
  ends_at                  timestamptz,
  customer_name            text,
  customer_phone           text,
  service_id               uuid,
  service_name             text,
  service_duration_minutes integer,
  service_price_cents      integer
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

  if not exists (
    select 1
    from public.appointments a
    where a.id = p_appointment_id
      and a.barber_id = v_barber_id
  ) then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query
  select
    a.id,
    a.status,
    a.starts_at,
    a.ends_at,
    a.customer_name,
    a.customer_phone,
    s.id,
    s.name,
    s.duration_minutes,
    s.price_cents
  from public.appointments a
  join public.services s on s.id = a.service_id
  where a.id = p_appointment_id
    and a.barber_id = v_barber_id;
end;
$$;

-- ============================================================================
-- 2. Espacios para citas manuales
-- ============================================================================

-- Igual que `get_available_slots`, pero para el barbero autenticado y sin la
-- regla de 1 hora de antelación: el barbero puede agendar un bloque en curso
-- mientras no haya terminado. Sigue respetando horario, bloqueos y citas
-- confirmadas, y el máximo de 30 días locales.
create or replace function public.admin_get_slots(
  p_date date
)
returns table (
  slot_start timestamptz,
  slot_end   timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  c_slot_minutes constant integer := 30;
  v_barber_id    uuid;
  v_timezone     text;
  v_today        date;
begin
  select br.id, b.timezone
    into v_barber_id, v_timezone
  from public.barbers br
  join public.businesses b on b.id = br.business_id
  where br.auth_user_id = auth.uid()
    and br.active;

  if v_barber_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  v_today := (now() at time zone v_timezone)::date;

  if p_date is null or p_date < v_today or p_date > v_today + 30 then
    return;
  end if;

  return query
  with slots as (
    select
      (gs.ts at time zone v_timezone) as slot_start
    from public.working_hours wh
    cross join lateral generate_series(
      p_date::timestamp + wh.start_time,
      p_date::timestamp + wh.end_time - make_interval(mins => c_slot_minutes),
      make_interval(mins => c_slot_minutes)
    ) as gs(ts)
    where wh.barber_id = v_barber_id
      and wh.weekday = extract(dow from p_date)::smallint
  )
  select
    s.slot_start,
    s.slot_start + make_interval(mins => c_slot_minutes) as slot_end
  from slots s
  where s.slot_start + make_interval(mins => c_slot_minutes) > now()
    and not exists (
      select 1
      from public.time_off t
      where t.barber_id = v_barber_id
        and tstzrange(t.starts_at, t.ends_at, '[)')
            && tstzrange(
                 s.slot_start,
                 s.slot_start + make_interval(mins => c_slot_minutes),
                 '[)'
               )
    )
    and not exists (
      select 1
      from public.appointments a
      where a.barber_id = v_barber_id
        and a.status = 'confirmed'
        and tstzrange(a.starts_at, a.ends_at, '[)')
            && tstzrange(
                 s.slot_start,
                 s.slot_start + make_interval(mins => c_slot_minutes),
                 '[)'
               )
    )
  order by s.slot_start;
end;
$$;

-- ============================================================================
-- 3. Alta manual de citas (walk-in)
-- ============================================================================

-- Cita creada por el propio barbero. Sin antelación de 1 hora y sin límite de
-- 3 citas por teléfono, pero con las mismas garantías de agenda: alineación,
-- horario, bloqueos, máximo de 30 días, duración del servicio y anti-solape.
create or replace function public.admin_create_appointment(
  p_service_id     uuid,
  p_starts_at      timestamptz,
  p_customer_name  text,
  p_customer_phone text
)
returns table (
  appointment_id uuid,
  starts_at      timestamptz,
  ends_at        timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_barber_id   uuid;
  v_business_id uuid;
  v_timezone    text;
  v_duration    integer;
  v_end         timestamptz;
  v_local_start timestamp;
  v_local_end   timestamp;
  v_today       date;
  v_name        text;
  v_phone       text;
  v_id          uuid;
begin
  select br.id, br.business_id, b.timezone
    into v_barber_id, v_business_id, v_timezone
  from public.barbers br
  join public.businesses b on b.id = br.business_id
  where br.auth_user_id = auth.uid()
    and br.active;

  if v_barber_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  select s.duration_minutes
    into v_duration
  from public.services s
  where s.id = p_service_id
    and s.business_id = v_business_id
    and s.active;

  if v_duration is null then
    raise exception 'SERVICE_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_name := btrim(coalesce(p_customer_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'INVALID_NAME' using errcode = 'P0001';
  end if;

  v_phone := public.normalize_cr_phone(p_customer_phone);
  if v_phone is null then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;

  if p_starts_at is null then
    raise exception 'SLOT_NOT_ALIGNED' using errcode = 'P0001';
  end if;

  v_end         := p_starts_at + make_interval(mins => v_duration);
  v_local_start := p_starts_at at time zone v_timezone;
  v_local_end   := v_end at time zone v_timezone;
  v_today       := (now() at time zone v_timezone)::date;

  if extract(second from v_local_start) <> 0
     or (extract(minute from v_local_start)::integer % 30) <> 0 then
    raise exception 'SLOT_NOT_ALIGNED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.working_hours wh
    where wh.barber_id = v_barber_id
      and wh.weekday = extract(dow from v_local_start)::smallint
      and v_local_start::time >= wh.start_time
      and v_local_end::time <= wh.end_time
  ) then
    raise exception 'SLOT_OUTSIDE_WORKING_HOURS' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.time_off t
    where t.barber_id = v_barber_id
      and tstzrange(t.starts_at, t.ends_at, '[)')
          && tstzrange(p_starts_at, v_end, '[)')
  ) then
    raise exception 'SLOT_BLOCKED' using errcode = 'P0001';
  end if;

  if v_local_start::date > v_today + 30 then
    raise exception 'SLOT_TOO_FAR' using errcode = 'P0001';
  end if;

  -- Se permite el bloque en curso mientras no haya terminado.
  if v_end <= now() then
    raise exception 'SLOT_IN_THE_PAST' using errcode = 'P0001';
  end if;

  insert into public.appointments (
    business_id, barber_id, service_id, customer_name, customer_phone,
    starts_at, ends_at, status
  )
  values (
    v_business_id, v_barber_id, p_service_id, v_name, v_phone,
    p_starts_at, v_end, 'confirmed'
  )
  returning id into v_id;

  return query select v_id, p_starts_at, v_end;

exception
  -- Carrera perdida contra otra cita confirmada del mismo bloque.
  when exclusion_violation or unique_violation then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
end;
$$;

-- ============================================================================
-- 4. Cambio libre de estado
-- ============================================================================

-- Cualquier estado puede pasar a cualquier otro en cualquier momento. Al
-- volver a `confirmed` el constraint de exclusión sigue mandando: si el bloque
-- ya está ocupado, se responde `SLOT_TAKEN`. `cancelled_at` solo tiene valor
-- cuando el estado es `cancelled`.
create or replace function public.admin_set_appointment_status(
  p_appointment_id uuid,
  p_status         public.appointment_status
)
returns table (
  appointment_id uuid,
  status         public.appointment_status
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_barber_id uuid;
  v_id        uuid;
  v_status    public.appointment_status;
begin
  select br.id
    into v_barber_id
  from public.barbers br
  where br.auth_user_id = auth.uid()
    and br.active;

  if v_barber_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_status is null then
    raise exception 'INVALID_STATUS' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.appointments a
    where a.id = p_appointment_id
      and a.barber_id = v_barber_id
  ) then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.appointments a
     set status = p_status,
         cancelled_at = case
           when p_status = 'cancelled'::public.appointment_status then now()
           else null
         end
   where a.id = p_appointment_id
     and a.barber_id = v_barber_id
  returning a.id, a.status into v_id, v_status;

  if v_id is null then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query select v_id, v_status;

exception
  -- Al restaurar `confirmed` sobre un bloque ya ocupado.
  when exclusion_violation then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
end;
$$;

-- ============================================================================
-- 5. Permisos: solo el barbero autenticado
-- ============================================================================

revoke all on function public.admin_get_agenda(date, date) from public, anon;
revoke all on function public.admin_get_appointment(uuid) from public, anon;
revoke all on function public.admin_get_slots(date) from public, anon;
revoke all on function public.admin_create_appointment(uuid, timestamptz, text, text) from public, anon;
revoke all on function public.admin_set_appointment_status(uuid, public.appointment_status) from public, anon;

grant execute on function public.admin_get_agenda(date, date) to authenticated;
grant execute on function public.admin_get_appointment(uuid) to authenticated;
grant execute on function public.admin_get_slots(date) to authenticated;
grant execute on function public.admin_create_appointment(uuid, timestamptz, text, text) to authenticated;
grant execute on function public.admin_set_appointment_status(uuid, public.appointment_status) to authenticated;

-- Refresca el esquema que PostgREST mantiene en caché.
notify pgrst, 'reload schema';
