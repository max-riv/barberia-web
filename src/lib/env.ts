/**
 * Zona horaria del negocio. Costa Rica no tiene horario de verano (UTC-6).
 * Todo cálculo de fechas debe usarla explícitamente.
 */
export const BUSINESS_TIMEZONE = "America/Costa_Rica" as const;

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

/**
 * Devuelve las credenciales públicas de Supabase o `null` si el entorno
 * todavía no está configurado. Así el build no falla sin variables: el
 * endpoint /api/health avisa que falta configuración.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}
