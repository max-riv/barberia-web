import type { AppointmentStatus } from "@/lib/appointment";

export type AdminErrorField =
  "name" | "phone" | "slot" | "service" | "status" | "appointment";

export type AdminError = {
  message: string;
  field?: AdminErrorField;
};

export const ADMIN_GENERIC_ERROR =
  "No pudimos completar la acción. Inténtalo de nuevo en un momento.";

export const ADMIN_UNAVAILABLE_ERROR =
  "El panel no está disponible ahora mismo. Inténtalo luego.";

type AdminErrorRule = {
  code: string;
  message: string;
  field?: AdminErrorField;
};

const ADMIN_ERROR_RULES: readonly AdminErrorRule[] = [
  {
    code: "NOT_AUTHENTICATED",
    message: "Tu sesión expiró. Vuelve a iniciar sesión.",
  },
  {
    code: "APPOINTMENT_NOT_FOUND",
    message: "No encontramos esa cita.",
    field: "appointment",
  },
  {
    code: "SERVICE_NOT_FOUND",
    message: "Ese servicio ya no está disponible.",
    field: "service",
  },
  {
    code: "INVALID_NAME",
    message: "Escribe el nombre del cliente (entre 2 y 80 caracteres).",
    field: "name",
  },
  {
    code: "INVALID_PHONE",
    message: "Ese teléfono no parece válido. Usa un número de Costa Rica.",
    field: "phone",
  },
  {
    code: "SLOT_NOT_ALIGNED",
    message: "Elige un horario válido (cada 30 minutos).",
    field: "slot",
  },
  {
    code: "SLOT_OUTSIDE_WORKING_HOURS",
    message: "Ese horario está fuera del horario de atención.",
    field: "slot",
  },
  {
    code: "SLOT_BLOCKED",
    message: "Ese horario está bloqueado. Elige otro.",
    field: "slot",
  },
  {
    code: "SLOT_TOO_FAR",
    message: "Solo se puede agendar hasta 30 días antes.",
    field: "slot",
  },
  {
    code: "SLOT_IN_THE_PAST",
    message: "Ese horario ya pasó. Elige otro.",
    field: "slot",
  },
  {
    code: "SLOT_TAKEN",
    message: "Ese espacio ya está ocupado. Elige otro horario.",
    field: "slot",
  },
  {
    code: "INVALID_STATUS",
    message: "Ese estado no es válido.",
    field: "status",
  },
];

/** Traduce un error de las RPC del panel a un mensaje en español. */
export function mapAdminError(message: string): AdminError {
  for (const rule of ADMIN_ERROR_RULES) {
    if (message.includes(rule.code)) {
      return { message: rule.message, field: rule.field };
    }
  }

  return { message: ADMIN_GENERIC_ERROR };
}

/** Estado del formulario de cita manual. */
export type AdminCreateState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: AdminErrorField };

export const initialAdminCreateState: AdminCreateState = { status: "idle" };

/** Estado de los botones de cambio de estado de una cita. */
export type AdminStatusState =
  | { status: "idle" }
  | { status: "updated"; appointmentStatus: AppointmentStatus }
  | { status: "error"; message: string; field?: AdminErrorField };

export const initialAdminStatusState: AdminStatusState = { status: "idle" };
