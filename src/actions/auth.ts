"use server";

import { redirect } from "next/navigation";

import type { LoginState } from "@/lib/auth-state";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth";

const INVALID_CREDENTIALS = "Email o contraseña incorrectos.";
const UNAVAILABLE = "El panel no está disponible ahora mismo. Inténtalo luego.";

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * Inicia sesión con email y contraseña. Los errores de Supabase no se exponen:
 * todos los fallos de credenciales se muestran con el mismo mensaje.
 */
export async function signInAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = readString(formData.get("email")).trim();
  const password = readString(formData.get("password"));

  if (!email) {
    return {
      status: "error",
      message: "Escribe tu email.",
      field: "email",
    };
  }

  if (!password) {
    return {
      status: "error",
      message: "Escribe tu contraseña.",
      field: "password",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { status: "error", message: UNAVAILABLE };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: INVALID_CREDENTIALS };
  }

  // `redirect` lanza una excepción de control: debe quedar fuera de try/catch.
  redirect("/admin");
}

/** Cierra la sesión del barbero y vuelve al login. */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseAuthServerClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/admin/login");
}
