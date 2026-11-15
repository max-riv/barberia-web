-- ============================================================================
-- Fase 1.1 · Base de datos, reglas de negocio y seguridad
-- Charlie's Barbershop · America/Costa_Rica
--
-- Aplicar en Supabase → SQL Editor → New query → Run.
-- Es idempotente: se puede ejecutar varias veces sin duplicar nada.
--
-- Contenido:
--   1. Tipos y tablas
--   2. Índices y constraint anti-doble-reserva
--   3. Funciones de disponibilidad, reserva y cancelación
--   4. RLS y GRANT explícitos
--   5. Seed de Charlie's Barbershop
-- ============================================================================

set search_path = public, extensions, pg_temp;

create extension if not exists btree_gist;

-- ============================================================================
-- 1. Tipos y tablas
-- ============================================================================

do $$
begin
  create type public.appointment_status as enum
    ('confirmed', 'cancelled', 'completed', 'no_show');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.businesses (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(btrim(name)) between 2 and 120),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  timezone       text not null default 'America/Costa_Rica',
  whatsapp_phone text not null check (whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  address        text,
  currency       char(3) not null default 'CRC',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.barbers (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- permite la FK compuesta de appointments y garantiza misma barbería
  unique (id, business_id)
);

create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 2 and 80),
  duration_minutes integer not null default 30
    check (duration_minutes > 0 and duration_minutes <= 240),
  price_cents      integer not null default 0 check (price_cents >= 0),
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, business_id)
);

-- Un tramo por cada bloque de trabajo. El descanso se modela partiendo el día
-- en dos tramos (por ejemplo 08:00–12:00 y 13:00–18:00).
create table if not exists public.working_hours (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references public.barbers (id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time   time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint working_hours_range_check check (start_time < end_time),
  unique (barber_id, weekday, start_time)
);

-- Bloqueos puntuales: descansos especiales, citas personales, días libres.
create table if not exists public.time_off (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references public.barbers (id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_off_range_check check (ends_at > starts_at)
);

create table if not exists public.appointments (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  barber_id      uuid not null,
  service_id     uuid not null,
  customer_name  text not null
    check (char_length(btrim(customer_name)) between 2 and 80),
  customer_phone text not null
    check (customer_phone ~ '^\+[1-9][0-9]{7,14}$'),
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  status         public.appointment_status not null default 'confirmed',
  cancel_token   uuid not null default gen_random_uuid() unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  cancelled_at   timestamptz,
  constraint appointments_range_check check (ends_at > starts_at),
  constraint appointments_barber_fk
    foreign key (barber_id, business_id)
    references public.barbers (id, business_id) on delete cascade,
  constraint appointments_service_fk
    foreign key (service_id, business_id)
    references public.services (id, business_id) on delete cascade
);

comment on table public.appointments is
  'Citas. El público no tiene acceso directo: solo a través de las funciones RPC.';
comment on column public.appointments.cancel_token is
  'Token secreto del enlace de cancelación del cliente.';

-- ============================================================================
-- 2. Índices y constraint anti-doble-reserva
-- ============================================================================

create index if not exists appointments_barber_start_idx
  on public.appointments (barber_id, starts_at);

create index if not exists appointments_status_start_idx
  on public.appointments (status, starts_at);

create index if not exists time_off_barber_start_idx
  on public.time_off (barber_id, starts_at);

create index if not exists working_hours_barber_weekday_idx
  on public.working_hours (barber_id, weekday);

-- La garantía real contra la doble reserva: dos citas confirmadas del mismo
-- barbero no pueden solaparse, ni siquiera si llegan en el mismo instante.
-- Postgres rechaza la segunda con SQLSTATE 23P01 (exclusion_violation).
do $$
begin
  alter table public.appointments
    add constraint appointments_no_overlap
    exclude using gist (
      barber_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (status = 'confirmed'::public.appointment_status);
exception
  when duplicate_object then null;
end $$;

-- updated_at automático ------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'businesses', 'barbers', 'services', 'working_hours', 'time_off', 'appointments'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I', t
    );
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t
    );
  end loop;
end $$;

-- ============================================================================
-- 3. Funciones
-- ============================================================================

-- Normaliza teléfonos de Costa Rica a E.164 (+506XXXXXXXX).
-- Acepta 87677997, 50687677997, +50687677997 y números internacionales.
create or replace function public.normalize_cr_phone(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  if p_phone is null then
    return null;
  end if;

  v := regexp_replace(p_phone, '[^0-9+]', '', 'g');

  if v ~ '^\+506[0-9]{8}$' then
    return v;
  end if;

  if v ~ '^506[0-9]{8}$' then
    return '+' || v;
  end if;

  if v ~ '^[678][0-9]{7}$' then
    return '+506' || v;
  end if;

  if v ~ '^\+[1-9][0-9]{7,14}$' then
    return v;
  end if;

  return null;
end;
$$;

-- Espacios libres de un barbero para una fecha local (America/Costa_Rica).
-- Devuelve bloques de 30 minutos dentro del horario, sin descansos, sin citas
-- confirmadas y sin espacios a menos de 1 hora.
create or replace function public.get_available_slots(
  p_barber_id uuid,
  p_date      date
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
declare
  c_slot_minutes constant integer := 30;
  v_timezone     text;
  v_today        date;
begin
  select b.timezone
    into v_timezone
  from public.barbers br
  join public.businesses b on b.id = br.business_id
  where br.id = p_barber_id
    and br.active;

  if v_timezone is null then
    return;
  end if;

  v_today := (now() at time zone v_timezone)::date;

  if p_date < v_today or p_date > v_today + 30 then
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
    where wh.barber_id = p_barber_id
      and wh.weekday = extract(dow from p_date)::smallint
  )
  select
    s.slot_start,
    s.slot_start + make_interval(mins => c_slot_minutes) as slot_end
  from slots s
  where s.slot_start >= now() + interval '1 hour'
    and not exists (
      select 1
      from public.time_off t
      where t.barber_id = p_barber_id
        and tstzrange(t.starts_at, t.ends_at, '[)')
            && tstzrange(s.slot_start, s.slot_start + make_interval(mins => c_slot_minutes), '[)')
    )
    and not exists (
      select 1
      from public.appointments a
      where a.barber_id = p_barber_id
        and a.status = 'confirmed'
        and tstzrange(a.starts_at, a.ends_at, '[)')
            && tstzrange(s.slot_start, s.slot_start + make_interval(mins => c_slot_minutes), '[)')
    )
  order by s.slot_start;
end;
$$;

-- Reserva un espacio. Toda la validación ocurre aquí, nunca en el navegador.
-- Errores de negocio (SQLSTATE P0001):
--   BARBER_NOT_FOUND | SERVICE_NOT_FOUND | SLOT_TOO_SOON | SLOT_TOO_FAR
--   SLOT_NOT_ALIGNED | SLOT_OUTSIDE_WORKING_HOURS | SLOT_BLOCKED
--   SLOT_TAKEN | INVALID_NAME | INVALID_PHONE
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

-- Cancela con el token del cliente. Solo hasta el inicio de la cita.
create or replace function public.cancel_appointment(p_token uuid)
returns table (
  status     public.appointment_status,
  starts_at  timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_id     uuid;
  v_start  timestamptz;
  v_status public.appointment_status;
begin
  select a.id, a.starts_at, a.status
    into v_id, v_start, v_status
  from public.appointments a
  where a.cancel_token = p_token;

  if v_id is null then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_status = 'cancelled' then
    return query select 'cancelled'::public.appointment_status, v_start;
    return;
  end if;

  if v_status <> 'confirmed' then
    raise exception 'APPOINTMENT_NOT_CANCELLABLE' using errcode = 'P0001';
  end if;

  if v_start <= now() then
    raise exception 'CANCELLATION_TOO_LATE' using errcode = 'P0001';
  end if;

  update public.appointments
     set status = 'cancelled', cancelled_at = now()
   where id = v_id;

  return query select 'cancelled'::public.appointment_status, v_start;
end;
$$;

-- ============================================================================
-- 4. RLS y permisos explícitos
-- ============================================================================

alter table public.businesses    enable row level security;
alter table public.barbers       enable row level security;
alter table public.services      enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off      enable row level security;
alter table public.appointments  enable row level security;

-- Público ---------------------------------------------------------------------

drop policy if exists businesses_public_read on public.businesses;
create policy businesses_public_read on public.businesses
  for select to anon, authenticated using (true);

drop policy if exists barbers_public_read on public.barbers;
create policy barbers_public_read on public.barbers
  for select to anon using (active);

drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select to anon, authenticated using (true);

drop policy if exists working_hours_public_read on public.working_hours;
create policy working_hours_public_read on public.working_hours
  for select to anon, authenticated using (true);

-- Dueño de los datos (el barbero autenticado) ----------------------------------

drop policy if exists barbers_owner_read on public.barbers;
create policy barbers_owner_read on public.barbers
  for select to authenticated using (auth_user_id = auth.uid());

drop policy if exists barbers_owner_update on public.barbers;
create policy barbers_owner_update on public.barbers
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists working_hours_owner_all on public.working_hours;
create policy working_hours_owner_all on public.working_hours
  for all to authenticated
  using (exists (
    select 1 from public.barbers b
    where b.id = working_hours.barber_id and b.auth_user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.barbers b
    where b.id = working_hours.barber_id and b.auth_user_id = auth.uid()
  ));

drop policy if exists time_off_owner_all on public.time_off;
create policy time_off_owner_all on public.time_off
  for all to authenticated
  using (exists (
    select 1 from public.barbers b
    where b.id = time_off.barber_id and b.auth_user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.barbers b
    where b.id = time_off.barber_id and b.auth_user_id = auth.uid()
  ));

drop policy if exists appointments_owner_select on public.appointments;
create policy appointments_owner_select on public.appointments
  for select to authenticated
  using (exists (
    select 1 from public.barbers b
    where b.id = appointments.barber_id and b.auth_user_id = auth.uid()
  ));

drop policy if exists appointments_owner_insert on public.appointments;
create policy appointments_owner_insert on public.appointments
  for insert to authenticated
  with check (exists (
    select 1 from public.barbers b
    where b.id = appointments.barber_id and b.auth_user_id = auth.uid()
  ));

drop policy if exists appointments_owner_update on public.appointments;
create policy appointments_owner_update on public.appointments
  for update to authenticated
  using (exists (
    select 1 from public.barbers b
    where b.id = appointments.barber_id and b.auth_user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.barbers b
    where b.id = appointments.barber_id and b.auth_user_id = auth.uid()
  ));

-- Grants ----------------------------------------------------------------------

revoke all on public.businesses, public.barbers, public.services,
              public.working_hours, public.time_off, public.appointments
  from anon, authenticated;

grant select on public.businesses to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select on public.working_hours to anon, authenticated;

-- El público solo ve datos no sensibles del barbero.
grant select (id, business_id, display_name, active) on public.barbers to anon;
grant select on public.barbers to authenticated;
grant insert, update, delete on public.barbers to authenticated;

grant insert, update, delete on public.services to authenticated;
grant insert, update, delete on public.working_hours to authenticated;
grant select, insert, update, delete on public.time_off to authenticated;
grant select, insert, update on public.appointments to authenticated;

-- El público NO recibe ningún permiso sobre appointments ni time_off.

revoke all on function public.get_available_slots(uuid, date) from public;
revoke all on function public.book_appointment(uuid, uuid, timestamptz, text, text) from public;
revoke all on function public.cancel_appointment(uuid) from public;
revoke all on function public.normalize_cr_phone(text) from public;

grant execute on function public.get_available_slots(uuid, date) to anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, text, text) to anon, authenticated;
grant execute on function public.cancel_appointment(uuid) to anon, authenticated;

-- ============================================================================
-- 5. Seed de Charlie's Barbershop (idempotente)
-- ============================================================================

insert into public.businesses (id, name, slug, timezone, whatsapp_phone, currency)
values (
  '00000000-0000-4000-8000-000000000001',
  'Charlie''s Barbershop',
  'charlies-barbershop',
  'America/Costa_Rica',
  '+50687677997',
  'CRC'
)
on conflict (id) do nothing;

insert into public.barbers (id, business_id, display_name)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Charlie'
)
on conflict (id) do nothing;

insert into public.services (id, business_id, name, duration_minutes, price_cents)
values (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  'Corte',
  30,
  600000
)
on conflict (id) do nothing;

-- Lunes, martes, jueves, viernes, sábado y domingo (miércoles cerrado).
-- Dos tramos por día: el hueco 12:00–13:00 es el descanso.
insert into public.working_hours (barber_id, weekday, start_time, end_time)
select
  '00000000-0000-4000-8000-000000000002'::uuid,
  d.dia::smallint,
  tramo.inicio,
  tramo.fin
from (values (0), (1), (2), (4), (5), (6)) as d(dia)
cross join (
  values
    (time '08:00', time '12:00'),
    (time '13:00', time '18:00')
) as tramo(inicio, fin)
on conflict (barber_id, weekday, start_time) do nothing;

-- Refresca el esquema que PostgREST mantiene en caché.
notify pgrst, 'reload schema';
