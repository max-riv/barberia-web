-- ============================================================================
-- Fix Fase 1.3 · `get_appointment_by_token` devuelve `character(3)` en la
-- columna 13 (`business_currency`) pero la función la declara como `text`.
-- PostgreSQL no convierte implícitamente `bpchar` a `text` en `RETURN QUERY`,
-- así que toda llamada falla con 42804 y la página /cita/[token] muestra 404
-- justo después de reservar.
--
-- Aplicar en Supabase → SQL Editor → New query → Run. Idempotente.
-- ============================================================================

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
    b.currency::text,   -- char(3) -> text (columna 13)
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
