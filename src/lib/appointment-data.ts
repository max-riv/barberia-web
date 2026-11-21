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
    return null;
  }

  return parsePublicAppointment(data);
}
