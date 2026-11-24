"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  adminAppointmentHref,
  isUuid,
  parseAdminCreatedAppointment,
  parseAdminStatusUpdate,
} from "@/lib/admin";
import {
  ADMIN_GENERIC_ERROR,
  ADMIN_UNAVAILABLE_ERROR,
  mapAdminError,
  type AdminCreateState,
  type AdminStatusState,
} from "@/lib/admin-state";
import { parseAppointmentStatus } from "@/lib/appointment";
import {
  formatSlotTime,
  normalizeCostaRicaPhone,
  normalizeCustomerName,
} from "@/lib/booking";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth";

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * Crea una cita manual desde el panel. La base de datos vuelve a validar
 * servicio, horario, bloqueos, fecha y doble reserva; aquí solo se valida la
 * forma de los datos y se traducen los errores.
 */
export async function createAdminAppointmentAction(
  _previousState: AdminCreateState,
  formData: FormData,
): Promise<AdminCreateState> {
  const name = normalizeCustomerName(readString(formData.get("nombre")));

  if (!name) {
    return {
      status: "error",
      message: "Escribe el nombre del cliente (entre 2 y 80 caracteres).",
      field: "name",
    };
  }

  const phone = normalizeCostaRicaPhone(readString(formData.get("telefono")));

  if (!phone) {
    return {
      status: "error",
      message: "Ese teléfono no parece válido. Usa un número de Costa Rica.",
      field: "phone",
    };
  }

  const serviceId = readString(formData.get("servicio")).trim();

  if (!isUuid(serviceId)) {
    return {
      status: "error",
      message: "Elige un servicio.",
      field: "service",
    };
  }

  const rawStart = readString(formData.get("inicio"));
  const startsAt = new Date(rawStart);

  if (!rawStart || Number.isNaN(startsAt.getTime())) {
    return {
      status: "error",
      message: "Elige un horario para la cita.",
      field: "slot",
    };
  }

  const localTime = formatSlotTime(startsAt.toISOString());
  const localMinutes = Number(localTime.slice(3, 5));

  if (!Number.isFinite(localMinutes) || localMinutes % 30 !== 0) {
    return {
      status: "error",
      message: "Elige un horario válido (cada 30 minutos).",
      field: "slot",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { status: "error", message: ADMIN_UNAVAILABLE_ERROR };
  }

  const { data, error } = await supabase.rpc("admin_create_appointment", {
    p_service_id: serviceId,
    p_starts_at: startsAt.toISOString(),
    p_customer_name: name,
    p_customer_phone: phone,
  });

  if (error) {
    const mapped = mapAdminError(String(error.message));
    return { status: "error", message: mapped.message, field: mapped.field };
  }

  const appointment = parseAdminCreatedAppointment(data);

  if (!appointment) {
    return { status: "error", message: ADMIN_GENERIC_ERROR };
  }

  revalidatePath("/admin");

  // `redirect` lanza una excepción de control: debe quedar fuera de try/catch.
  redirect(adminAppointmentHref(appointment.id));
}

/**
 * Cambia el estado de una cita. La base de datos valida la propiedad y el
 * constraint de exclusión al volver a `confirmed`.
 */
export async function setAppointmentStatusAction(
  _previousState: AdminStatusState,
  formData: FormData,
): Promise<AdminStatusState> {
  const id = readString(formData.get("id")).trim();

  if (!isUuid(id)) {
    return {
      status: "error",
      message: "No encontramos esa cita.",
      field: "appointment",
    };
  }

  const status = parseAppointmentStatus(readString(formData.get("estado")));

  if (!status) {
    return {
      status: "error",
      message: "Ese estado no es válido.",
      field: "status",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { status: "error", message: ADMIN_UNAVAILABLE_ERROR };
  }

  const { data, error } = await supabase.rpc("admin_set_appointment_status", {
    p_appointment_id: id,
    p_status: status,
  });

  if (error) {
    const mapped = mapAdminError(String(error.message));
    return { status: "error", message: mapped.message, field: mapped.field };
  }

  const updated = parseAdminStatusUpdate(data);

  if (!updated) {
    return { status: "error", message: ADMIN_GENERIC_ERROR };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/citas/${id}`);

  return { status: "updated", appointmentStatus: updated.status };
}
