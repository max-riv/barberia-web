---
name: Migraciones Supabase
description: Usar para cualquier cambio de base de datos en este proyecto (tablas, índices, RLS, funciones SQL, auth). Explica cómo escribir, aplicar y verificar migraciones.
---

# Migraciones Supabase

## Reglas de oro

- La base de datos cambia **solo** por migraciones en `supabase/migrations/`.
  Nunca desde el dashboard ni editando una migración ya aplicada.
- Cada cambio es un archivo nuevo con fecha:
  `YYYYMMDDHHMMSS_descripcion.sql` (por ejemplo
  `20261121000001_fix_get_appointment_by_token_currency.sql`).
- Nunca uses `service_role` ni claves `secret`, ni en el cliente ni en scripts.
- Las reglas de negocio viven en SQL, no en el navegador.
- El público (`anon`) no lee ni escribe `appointments` ni `time_off`: solo
  ejecuta funciones RPC.

## Estructura de una migración

1. Cabecera con el propósito y cómo aplicarla.
2. `set search_path = public, extensions, pg_temp;`
3. Cambios idempotentes: `if not exists`, `create or replace`,
   `drop ... if exists`, bloques `do $$ ... exception when duplicate_object`.
4. `revoke all ... from public` y `grant execute ... to anon, authenticated`
   explícitos.
5. `notify pgrst, 'reload schema';` al final.

Plantilla lista para copiar: `references/plantilla-migracion.sql`.
Esquema y contratos actuales: `references/esquema-actual.md`.

## Funciones RPC

Patrón obligatorio:

```sql
create or replace function public.mi_funcion(p_param uuid)
returns table (
  id     uuid,
  nombre text
)
language plpgsql
stable                    -- volatile si escribe
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  -- Validaciones dentro de la función, no en el cliente.
  if not exists (select 1 from public.tabla t where t.id = p_param) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  return query
  select t.id, t.nombre::text   -- castea si el tipo no coincide
  from public.tabla t
  where t.id = p_param;
end;
$$;

revoke all on function public.mi_funcion(uuid) from public;
grant execute on function public.mi_funcion(uuid) to authenticated;
```

- `security definer` salta RLS: valida explícitamente quién puede llamar.
- Para el panel, exige `auth.uid()` y que coincida con
  `barbers.auth_user_id` (o con el `business_id` correspondiente).
- Captura `exclusion_violation` (23P01) y `unique_violation` (23505) para
  devolver conflictos de negocio, por ejemplo `SLOT_TAKEN`.

## Errores que ya nos pasaron

- **El tipo de retorno debe coincidir exactamente.** `businesses.currency` es
  `char(3)`, pero una función que lo declaraba `text` fallaba con
  `42804 structure of query does not match function result type`. Solución:
  castear en el `select` (`b.currency::text`). Revisa cada columna del
  `returns table` contra el tipo real devuelto.
- `EXCLUDE USING gist` necesita `create extension if not exists btree_gist;`.
- No compruebes solapes con un `SELECT` previo: usa el constraint y captura el
  error. Así se cubre también la concurrencia.

## Cómo aplicar

En este repo no hay Supabase CLI vinculado. Para desarrollo:

1. Copia el contenido del archivo.
2. Supabase → **SQL Editor → New query → Run**.
3. Verifica el resultado y que la función/tabla aparezca en el schema `public`.

Si algún día se vincula el CLI: `npx supabase db push`.

## Verificación

- `npm run test:db` ejecuta `scripts/db-smoke-test.mjs` con la clave anónima.
  Crea citas de prueba y las cancela; úsalo solo contra desarrollo.
- Prueba la RPC con `supabase.rpc(...)` o REST y confirma:
  - respuesta 200 con la forma esperada;
  - errores de negocio con el código correcto;
  - `anon` no puede leer `appointments` ni `time_off`.
- Si cambió el contrato, actualiza `src/types/database.ts` y los tipos que lo
  consumen.
- Antes de terminar: `npm run lint`, `npm run typecheck` y `npm run test`.

## Checklist

- [ ] Archivo nuevo con fecha; no edité una migración ya aplicada.
- [ ] Idempotente (se puede correr dos veces).
- [ ] `security definer` + `search_path = public, pg_temp`.
- [ ] Validaciones y errores dentro de la función.
- [ ] `revoke`/`grant` explícitos; `anon` sin acceso a tablas sensibles.
- [ ] `notify pgrst, 'reload schema';`.
- [ ] `npm run test:db` en verde.
- [ ] Tipos actualizados si cambió el contrato.
