-- ============================================================================
-- Fase 1.3 · Consulta pública de una cita por su token
--
-- Aplicar en Supabase → SQL Editor → New query → Run, después de las migraciones
-- de las fases 1.1 y 1.2. Es idempotente.
--
-- El público nunca lee `appointments`: esta función `security definer` devuelve
-- como máximo la fila cuyo `cancel_token` coincide con el enlace del cliente.
-- Sin token no hay datos, y con un token ajeno no se puede enumerar la agenda.
-- ============================================================================

set search_path = public, extensions, pg_temp;

create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  appointment_id           uuid,
  status                   public.appointment_status,
  starts_at                timestamptz,
  ends_at                  timestamptz,
  customer_name            text,
  customer_phone           text,
  service_name             text,
  service_duration_minutes integer,
  service_price_cents      integer,
  business_name            text,
  business_whatsapp        text,
  business_address         text,
  business_currency        text,
  business_timezone        text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  -- `cancel_token` es único: o hay exactamente una fila o no hay ninguna.
  -- Si el token no existe (o llega nulo), no se revela ningún dato.
  if not exists (
    select 1
    from public.appointments a
    where a.cancel_token = p_token
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
    s.name,
    s.duration_minutes,
    s.price_cents,
    b.name,
    b.whatsapp_phone,
    b.address,
    b.currency,
    b.timezone
  from public.appointments a
  join public.services s on s.id = a.service_id
  join public.businesses b on b.id = a.business_id
  where a.cancel_token = p_token;
end;
$$;

revoke all on function public.get_appointment_by_token(uuid) from public;
grant execute on function public.get_appointment_by_token(uuid)
  to anon, authenticated;

notify pgrst, 'reload schema';
