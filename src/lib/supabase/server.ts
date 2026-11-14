import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";

/**
 * Cliente de Supabase para el servidor usando la clave pública (anon).
 * Las políticas RLS son las que limitan el acceso: este cliente NUNCA debe
 * usarse con la clave secreta (service_role).
 */
export function createSupabaseServerClient(): SupabaseClient | null {
  const env = getSupabaseEnv();

  if (!env) {
    return null;
  }

  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
