import { getSupabaseEnv } from "@/lib/env";

/**
 * Comprobación de salud: confirma que la app está desplegada y que puede
 * hablar con Supabase. Se usa también como ping programado para evitar que
 * el proyecto gratuito de Supabase se pause por inactividad.
 */
export async function GET() {
  const startedAt = Date.now();
  const env = getSupabaseEnv();

  if (!env) {
    return Response.json(
      {
        status: "not_configured",
        database: "unknown",
        message:
          "Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      throw new Error(`Supabase respondió ${response.status}`);
    }

    return Response.json(
      {
        status: "ok",
        database: "ok",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        status: "error",
        database: "unreachable",
        message: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
