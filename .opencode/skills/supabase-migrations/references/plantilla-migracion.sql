-- ============================================================================
-- <Fase o motivo> · <Qué cambia y por qué>
--
-- Aplicar en Supabase → SQL Editor → New query → Run.
-- Es idempotente: se puede ejecutar varias veces sin duplicar nada.
-- ============================================================================

set search_path = public, extensions, pg_temp;

-- Si vas a usar EXCLUDE USING gist:
-- create extension if not exists btree_gist;

-- ----------------------------------------------------------------------------
-- Función RPC
-- ----------------------------------------------------------------------------

create or replace function public.mi_funcion(p_param uuid)
returns table (
  id     uuid,
  nombre text
)
language plpgsql
stable                      -- volatile si la función escribe
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  -- Valida dentro de la función. Nunca confíes en el cliente.
  if not exists (
    select 1
    from public.mi_tabla t
    where t.id = p_param
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Castea cualquier columna cuyo tipo no coincida exactamente con el
  -- declarado en `returns table` (por ejemplo char(3) -> text).
  return query
  select
    t.id,
    t.nombre::text
  from public.mi_tabla t
  where t.id = p_param;
end;
$$;

revoke all on function public.mi_funcion(uuid) from public;
grant execute on function public.mi_funcion(uuid) to authenticated;
-- grant execute on function public.mi_funcion(uuid) to anon; -- solo si es pública

-- ----------------------------------------------------------------------------
-- Si creas una tabla nueva (descomenta y adapta)
-- ----------------------------------------------------------------------------

-- create table if not exists public.mi_tabla (
--   id         uuid primary key default gen_random_uuid(),
--   nombre     text not null,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );
--
-- alter table public.mi_tabla enable row level security;
--
-- revoke all on public.mi_tabla from anon, authenticated;
-- grant select on public.mi_tabla to authenticated;
-- grant insert, update, delete on public.mi_tabla to authenticated;
--
-- drop policy if exists mi_tabla_select on public.mi_tabla;
-- create policy mi_tabla_select on public.mi_tabla
--   for select to authenticated
--   using (true);

-- ----------------------------------------------------------------------------
-- Recarga el esquema en PostgREST
-- ----------------------------------------------------------------------------

notify pgrst, 'reload schema';
