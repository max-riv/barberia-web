"use server";

import { BARBER_ID, SERVICE_ID } from "@/lib/business";
import {
  formatSlotTime,
  normalizeCostaRicaPhone,
  normalizeCustomerName,
  parseBookedAppointment,
} from "@/lib/booking";
import type { BookingState } from "@/lib/booking-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

type BookingErrorRule = {
  code: string;
  message: string;
  field?: "name" | "phone" | "slot";
};

const ERROR_RULES: readonly BookingErrorRule[] = [
  {
    code: "SLOT_TAKEN",
    message: "Ese espacio se acaba de ocupar. Elige otro horario.",
    field: "slot",
  },
  {
    code: "SLOT_TOO_SOON",
    message: "Ese horario ya no se puede reservar: falta menos de una hora.",
    field: "slot",
  },
  {
    code: "SLOT_TOO_FAR",
    message: "Solo se puede reservar hasta 30 días antes.",
    field: "slot",
  },
  {
    code: "SLOT_OUTSIDE_WORKING_HOURS",
    message: "Ese horario está fuera del horario de atención.",
    field: "slot",
  },
  {
    code: "SLOT_BLOCKED",
    message: "El barbero bloqueó ese horario. Elige otro.",
    field: "slot",
  },
  {
    code: "SLOT_NOT_ALIGNED",
    message: "Ese horario no es válido. Elige otro.",
    field: "slot",
  },
  {
    code: "INVALID_NAME",
    message: "Escribe tu nombre (entre 2 y 80 caracteres).",
    field: "name",
  },
  {
    code: "INVALID_PHONE",
    message: "Ese teléfono no parece válido. Usa un número de Costa Rica.",
    field: "phone",
  },
  {
    code: "TOO_MANY_APPOINTMENTS",
    message: "Ya tienes 3 citas activas. Cancela una antes de reservar otra.",
    field: "phone",
  },
];

function mapDatabaseError(message: string): BookingState {
  for (const rule of ERROR_RULES) {
    if (message.includes(rule.code)) {
      return { status: "error", message: rule.message, field: rule.field };
    }
  }

  return {
    status: "error",
    message: "No pudimos guardar tu cita. Inténtalo de nuevo en un momento.",
  };
}

/**
 * Reserva un espacio. El navegador no es la fuente de verdad: la base de datos
 * vuelve a validar antelación, horario, bloqueos y doble reserva.
 */
export async function bookAppointmentAction(
  _previousState: BookingState,
  formData: FormData,
): Promise<BookingState> {
  // Honeypot: un humano no ve este campo y lo deja vacío.
  if (readString(formData.get("empresa")).length > 0) {
    return {
      status: "error",
      message: "No pudimos procesar la reserva. Recarga la página.",
    };
  }

  const name = normalizeCustomerName(readString(formData.get("nombre")));
  if (!name) {
    return {
      status: "error",
      message: "Escribe tu nombre (entre 2 y 80 caracteres).",
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

  const rawStart = readString(formData.get("inicio"));
  const startsAt = new Date(rawStart);

  if (!rawStart || Number.isNaN(startsAt.getTime())) {
    return {
      status: "error",
      message: "Elige un horario para tu cita.",
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

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      message: "La reserva no está disponible ahora mismo. Inténtalo luego.",
    };
  }

  const { data, error } = await supabase.rpc("book_appointment", {
    p_barber_id: BARBER_ID,
    p_service_id: SERVICE_ID,
    p_starts_at: startsAt.toISOString(),
    p_customer_name: name,
    p_customer_phone: phone,
  });

  if (error) {
    return mapDatabaseError(String(error.message));
  }

  const appointment = parseBookedAppointment(data);

  if (!appointment) {
    return {
      status: "error",
      message: "No pudimos confirmar tu cita. Inténtalo de nuevo.",
    };
  }

  return {
    status: "success",
    appointment: {
      token: appointment.token,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      name,
      phone,
    },
  };
}
