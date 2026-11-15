-- ============================================================================
-- Fase 1.2 · Límite de citas activas por teléfono (antispam)
--
-- Aplicar en Supabase → SQL Editor → New query → Run, después de la migración
-- de la Fase 1.1. Es idempotente: reemplaza `book_appointment` por la misma
-- versión con una comprobación extra.
--
-- Regla: un mismo teléfono no puede tener más de 3 citas futuras confirmadas.
-- Se aplica en SQL para que no dependa del navegador.
-- ============================================================================

set search_path = public, extensions, pg_temp;

create or replace function public.book_appointment(
  p_barber_id      uuid,
  p_service_id     uuid,
  p_starts_at      timestamptz,
  p_customer_name  text,
  p_customer_phone text
)
returns table (
  appointment_id uuid,
  cancel_token   uuid,
  starts_at      timestamptz,
  ends_at        timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_business_id  uuid;
  v_active       boolean;
  v_timezone     text;
  v_duration     integer;
  v_end          timestamptz;
  v_local_start  timestamp;
  v_local_end    timestamp;
  v_name         text;
  v_phone        text;
  v_id           uuid;
  v_token        uuid;
begin
  select br.business_id, br.active, b.timezone
    into v_business_id, v_active, v_timezone
  from public.barbers br
  join public.businesses b on b.id = br.business_id
  where br.id = p_barber_id;

  if v_business_id is null or not v_active then
    raise exception 'BARBER_NOT_FOUND' using errcode = 'P0001';
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

  v_end         := p_starts_at + make_interval(mins => v_duration);
  v_local_start := p_starts_at at time zone v_timezone;
  v_local_end   := v_end at time zone v_timezone;

  if p_starts_at < now() + interval '1 hour' then
    raise exception 'SLOT_TOO_SOON' using errcode = 'P0001';
  end if;

  if v_local_start::date > (now() at time zone v_timezone)::date + 30 then
    raise exception 'SLOT_TOO_FAR' using errcode = 'P0001';
  end if;

  if extract(second from v_local_start) <> 0
     or (extract(minute from v_local_start)::integer % 30) <> 0 then
    raise exception 'SLOT_NOT_ALIGNED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.working_hours wh
    where wh.barber_id = p_barber_id
      and wh.weekday = extract(dow from v_local_start)::smallint
      and v_local_start::time >= wh.start_time
      and v_local_end::time <= wh.end_time
  ) then
    raise exception 'SLOT_OUTSIDE_WORKING_HOURS' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.time_off t
    where t.barber_id = p_barber_id
      and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(p_starts_at, v_end, '[)')
  ) then
    raise exception 'SLOT_BLOCKED' using errcode = 'P0001';
  end if;

  v_name := btrim(coalesce(p_customer_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'INVALID_NAME' using errcode = 'P0001';
  end if;

  v_phone := public.normalize_cr_phone(p_customer_phone);
  if v_phone is null then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;

  -- Antispam: un teléfono no puede acaparar la agenda.
  if (
    select count(*)
    from public.appointments a
    where a.customer_phone = v_phone
      and a.status = 'confirmed'
      and a.ends_at > now()
  ) >= 3 then
    raise exception 'TOO_MANY_APPOINTMENTS' using errcode = 'P0001';
  end if;

  insert into public.appointments (
    business_id, barber_id, service_id, customer_name, customer_phone,
    starts_at, ends_at, status
  )
  values (
    v_business_id, p_barber_id, p_service_id, v_name, v_phone,
    p_starts_at, v_end, 'confirmed'
  )
  returning id, cancel_token into v_id, v_token;

  return query select v_id, v_token, p_starts_at, v_end;

exception
  -- Carrera perdida contra otra reserva del mismo bloque.
  when exclusion_violation or unique_violation then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
end;
$$;

revoke all on function public.book_appointment(uuid, uuid, timestamptz, text, text) from public;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
