import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/env";

/**
 * Cliente de Supabase con la sesión del barbero, para Server Components,
 * Server Actions y Route Handlers.
 *
 * Usa la clave pública (anon): la sesión viaja en cookies y RLS/RPC son las
 * que autorizan. Nunca se usa `service_role`.
 *
 * Debe crearse uno nuevo por petición: no lo compartas entre renders.
 */
export async function createSupabaseAuthServerClient(): Promise<SupabaseClient | null> {
  const env = getSupabaseEnv();

  if (!env) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Un Server Component no puede escribir cookies. El proxy es quien
          // refresca la sesión; si falla aquí, el siguiente request lo hará.
        }
      },
    },
  });
}

export type AdminAccess =
  | { status: "unauthenticated" }
  | { status: "unlinked"; email: string }
  | {
      status: "ok";
      user: { id: string; email: string };
      barber: { id: string; businessId: string; displayName: string };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Sesión del panel. No redirige: la UI decide entre el login y la pantalla de
 * "cuenta sin vincular". La autorización real vive en las RPC.
 *
 * Si faltan las variables de entorno devuelve `unauthenticated` para que el
 * build no se rompa.
 */
export async function getAdminAccess(): Promise<AdminAccess> {
  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { status: "unauthenticated" };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "unauthenticated" };
  }

  const email = user.email ?? "";

  const { data, error } = await supabase
    .from("barbers")
    .select("id, business_id, display_name")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("No se pudo leer el barbero de la sesión:", error.message);
    return { status: "unlinked", email };
  }

  const barber: unknown = data;

  if (!isRecord(barber)) {
    return { status: "unlinked", email };
  }

  const { id, business_id: businessId, display_name: displayName } = barber;

  if (
    typeof id !== "string" ||
    typeof businessId !== "string" ||
    typeof displayName !== "string"
  ) {
    return { status: "unlinked", email };
  }

  return {
    status: "ok",
    user: { id: user.id, email },
    barber: { id, businessId, displayName },
  };
}
