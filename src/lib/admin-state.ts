import type { AppointmentStatus } from "@/lib/appointment";
import type { TimeOffConflict } from "@/lib/schedule";

export type AdminErrorField =
  | "name"
  | "phone"
  | "slot"
  | "service"
  | "status"
  | "appointment"
  | "weekday"
  | "ranges"
  | "timeOff"
  | "reason"
  | "address"
  | "price";

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
  {
    code: "INVALID_WEEKDAY",
    message: "Ese día de la semana no es válido.",
    field: "weekday",
  },
  {
    code: "INVALID_RANGES",
    message:
      "Revisa los tramos: cada uno va de hora en punto a hora en punto o y media (por ejemplo 08:00 a 12:00).",
    field: "ranges",
  },
  {
    code: "RANGES_OVERLAP",
    message: "Los tramos no se pueden solapar. Ajusta las horas.",
    field: "ranges",
  },
  {
    code: "TIME_OFF_INVALID",
    message: "La hora de fin tiene que ser después de la de inicio.",
    field: "timeOff",
  },
  {
    code: "TIME_OFF_IN_THE_PAST",
    message: "Ese bloqueo ya pasó. Elige una fecha y hora futuras.",
    field: "timeOff",
  },
  {
    code: "INVALID_REASON",
    message: "El motivo no puede pasar de 120 caracteres.",
    field: "reason",
  },
  {
    code: "TIME_OFF_NOT_FOUND",
    message: "No encontramos ese bloqueo.",
    field: "timeOff",
  },
  {
    code: "INVALID_BUSINESS_NAME",
    message: "Escribe el nombre del negocio (entre 2 y 120 caracteres).",
    field: "name",
  },
  {
    code: "INVALID_ADDRESS",
    message: "La dirección no puede pasar de 200 caracteres.",
    field: "address",
  },
  {
    code: "INVALID_PRICE",
    message: "Escribe un precio entre ₡0 y ₡100.000.",
    field: "price",
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

/** Estado del editor de horarios de un día. */
export type AdminWorkingHoursState =
  | { status: "idle" }
  | { status: "updated"; weekday: number }
  | { status: "error"; message: string; field?: AdminErrorField };

export const initialAdminWorkingHoursState: AdminWorkingHoursState = {
  status: "idle",
};

/**
 * Estado del formulario de bloqueos. En `"conflict"` se repite lo que el
 * usuario escribió (`fecha`, `inicio`, `fin`, `motivo`) para que la UI
 * ofrezca "Crear de todos modos" y reenvíe el formulario con `forzar=1`.
 */
export type AdminTimeOffState =
  | { status: "idle" }
  | { status: "created"; forced: boolean; conflicts: TimeOffConflict[] }
  | {
      status: "conflict";
      conflicts: TimeOffConflict[];
      fecha: string;
      inicio: string;
      fin: string;
      motivo: string;
    }
  | { status: "error"; message: string; field?: AdminErrorField };

export const initialAdminTimeOffState: AdminTimeOffState = { status: "idle" };

/** Estado de los botones de borrar un bloqueo. */
export type AdminTimeOffDeleteState =
  | { status: "idle" }
  | { status: "deleted" }
  | { status: "error"; message: string; field?: AdminErrorField };

export const initialAdminTimeOffDeleteState: AdminTimeOffDeleteState = {
  status: "idle",
};

/** Estado del formulario de ajustes del negocio. */
export type AdminSettingsState =
  | { status: "idle" }
  | {
      status: "updated";
      name: string;
      whatsappPhone: string;
      address: string | null;
    }
  | { status: "error"; message: string; field?: AdminErrorField };

export const initialAdminSettingsState: AdminSettingsState = {
  status: "idle",
};

/** Estado del formulario de precio de un servicio. */
export type AdminServicePriceState =
  | { status: "idle" }
  | { status: "updated"; serviceId: string; priceCents: number }
  | { status: "error"; message: string; field?: AdminErrorField };

export const initialAdminServicePriceState: AdminServicePriceState = {
  status: "idle",
};
