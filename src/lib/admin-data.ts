import {
  isUuid,
  parseAdminAppointment,
  parseAdminAppointments,
  type AdminAppointment,
} from "@/lib/admin";
import { isIsoDate, parseSlots, type BookingSlot } from "@/lib/booking";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isExpectedError(message: string, codes: readonly string[]): boolean {
  return codes.some((code) => message.includes(code));
}

/**
 * Agenda del barbero autenticado entre dos fechas locales inclusivas
 * (`YYYY-MM-DD`). Devuelve `null` si la sesión no es válida o la consulta falla.
 */
export async function loadAdminAgenda(
  from: string,
  to: string,
): Promise<AdminAppointment[] | null> {
  if (!isIsoDate(from) || !isIsoDate(to) || to < from) {
    return null;
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("admin_get_agenda", {
    p_from: from,
    p_to: to,
  });

  if (error) {
    if (!isExpectedError(String(error.message), ["NOT_AUTHENTICATED"])) {
      console.error("admin_get_agenda falló:", error.message);
    }
    return null;
  }

  return parseAdminAppointments(data);
}

/** Detalle de una cita del barbero autenticado, o `null` si no existe. */
export async function loadAdminAppointment(
  id: string,
): Promise<AdminAppointment | null> {
  if (!isUuid(id)) {
    return null;
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("admin_get_appointment", {
    p_appointment_id: id,
  });

  if (error) {
    if (
      !isExpectedError(String(error.message), [
        "NOT_AUTHENTICATED",
        "APPOINTMENT_NOT_FOUND",
      ])
    ) {
      console.error("admin_get_appointment falló:", error.message);
    }
    return null;
  }

  const appointment = parseAdminAppointment(data);

  if (!appointment) {
    console.error("admin_get_appointment devolvió un formato inesperado");
  }

  return appointment;
}

/**
 * Espacios libres de un día para citas manuales. Incluye bloques en curso
 * (sin la regla de 1 hora) y devuelve `null` si la consulta falla.
 */
export async function loadAdminSlots(
  date: string,
): Promise<BookingSlot[] | null> {
  if (!isIsoDate(date)) {
    return null;
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("admin_get_slots", {
    p_date: date,
  });

  if (error) {
    if (!isExpectedError(String(error.message), ["NOT_AUTHENTICATED"])) {
      console.error("admin_get_slots falló:", error.message);
    }
    return null;
  }

  return parseSlots(data);
}

/**
 * Días con horario de atención del barbero autenticado. Sirve para que el
 * panel solo ofrezca fechas laborables dentro de la ventana de 30 días.
 */
export async function loadAdminOpenWeekdays(
  barberId: string,
): Promise<number[] | null> {
  if (!isUuid(barberId)) {
    return null;
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("working_hours")
    .select("weekday")
    .eq("barber_id", barberId);

  if (error) {
    console.error("No se pudieron leer los días de atención:", error.message);
    return null;
  }

  if (!Array.isArray(data)) {
    return null;
  }

  const weekdays: number[] = [];

  for (const row of data) {
    if (!isRecord(row) || typeof row.weekday !== "number") {
      continue;
    }

    weekdays.push(row.weekday);
  }

  if (weekdays.length === 0) {
    return null;
  }

  return [...new Set(weekdays)].sort((a, b) => a - b);
}

export type AdminService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

/**
 * Servicios activos del negocio del barbero, para el formulario de cita
 * manual. Usa el cliente autenticado y filtra por el `business_id` de la
 * sesión; no depende de datos públicos.
 */
export async function loadAdminServices(
  businessId: string,
): Promise<AdminService[] | null> {
  if (!isUuid(businessId)) {
    return null;
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error(
      "No se pudieron leer los servicios del panel:",
      error.message,
    );
    return null;
  }

  if (!Array.isArray(data)) {
    return [];
  }

  const services: AdminService[] = [];

  for (const row of data) {
    if (!isRecord(row)) {
      continue;
    }

    const {
      id,
      name,
      duration_minutes: durationMinutes,
      price_cents: priceCents,
    } = row;

    if (
      typeof id !== "string" ||
      typeof name !== "string" ||
      typeof durationMinutes !== "number" ||
      !Number.isFinite(durationMinutes) ||
      typeof priceCents !== "number" ||
      !Number.isFinite(priceCents)
    ) {
      continue;
    }

    services.push({ id, name, durationMinutes, priceCents });
  }

  return services;
}
