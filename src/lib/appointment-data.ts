import {
  isAppointmentToken,
  parsePublicAppointment,
  type PublicAppointment,
} from "@/lib/appointment";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Cita del enlace de cancelación, consultada desde el servidor con la clave
 * anónima. Devuelve `null` si el token no es válido, no existe o la base no
 * responde; la página lo trata como 404.
 */
export async function loadPublicAppointment(
  token: string,
): Promise<PublicAppointment | null> {
  if (!isAppointmentToken(token)) {
    return null;
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_appointment_by_token", {
    p_token: token,
  });

  if (error) {
    // `APPOINTMENT_NOT_FOUND` es el caso esperado (enlace inválido o cita
    // borrada). Cualquier otro error es un fallo de la RPC y debe quedar en el
    // log: de lo contrario se muestra un 404 y la causa real queda oculta.
    if (error.message !== "APPOINTMENT_NOT_FOUND") {
      console.error("get_appointment_by_token falló:", error.message);
    }
    return null;
  }

  const appointment = parsePublicAppointment(data);
  if (!appointment) {
    console.error("get_appointment_by_token devolvió un formato inesperado");
  }
  return appointment;
}
