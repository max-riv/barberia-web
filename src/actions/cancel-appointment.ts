"use server";

import { revalidatePath } from "next/cache";

import { isAppointmentToken } from "@/lib/appointment";
import type { CancelState } from "@/lib/appointment-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const GENERIC_ERROR =
  "No pudimos cancelar la cita. Inténtalo de nuevo en un momento.";

function mapDatabaseError(message: string): CancelState {
  if (message.includes("APPOINTMENT_NOT_FOUND")) {
    return {
      status: "error",
      message: "No encontramos esa cita. Revisa que el enlace esté completo.",
    };
  }

  if (message.includes("CANCELLATION_TOO_LATE")) {
    return {
      status: "error",
      message: "Ya pasó la hora de inicio. Escríbenos por WhatsApp.",
    };
  }

  if (message.includes("APPOINTMENT_NOT_CANCELLABLE")) {
    return {
      status: "error",
      message: "Esta cita ya no se puede cancelar desde aquí.",
    };
  }

  return { status: "error", message: GENERIC_ERROR };
}

/**
 * Cancela la cita del token del enlace. La base de datos decide si todavía se
 * puede cancelar; aquí solo se valida el formato y se traducen los errores.
 */
export async function cancelAppointmentAction(
  _previousState: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const token = readString(formData.get("token")).trim();

  if (!isAppointmentToken(token)) {
    return {
      status: "error",
      message: "El enlace de la cita no es válido. Revisa que esté completo.",
    };
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return { status: "error", message: GENERIC_ERROR };
  }

  const { error } = await supabase.rpc("cancel_appointment", {
    p_token: token,
  });

  if (error) {
    return mapDatabaseError(String(error.message));
  }

  revalidatePath(`/cita/${token}`);

  return { status: "cancelled" };
}
