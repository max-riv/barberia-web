import {
  parseAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/appointment";
import {
  addDays,
  formatLongDate,
  formatSlotRange,
  localDateOf,
  todayInBusinessTimezone,
} from "@/lib/booking";

/** Cita tal como la devuelven `admin_get_agenda` y `admin_get_appointment`. */
export type AdminAppointment = {
  id: string;
  status: AppointmentStatus;
  /** ISO en UTC. */
  startsAt: string;
  /** ISO en UTC. */
  endsAt: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePriceCents: number;
};

/** Resultado de `admin_create_appointment` (solo lo necesario para navegar). */
export type AdminCreatedAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
};

/** Resultado de `admin_set_appointment_status`. */
export type AdminStatusUpdate = {
  id: string;
  status: AppointmentStatus;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Comprueba el formato de un UUID antes de mandarlo a la base de datos. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseAdminAppointmentRow(row: unknown): AdminAppointment | null {
  if (!isRecord(row)) {
    return null;
  }

  const id = row.appointment_id;
  const status = parseAppointmentStatus(row.status);
  const startsAt = row.starts_at;
  const endsAt = row.ends_at;
  const customerName = row.customer_name;
  const customerPhone = row.customer_phone;
  const serviceId = row.service_id;
  const serviceName = row.service_name;
  const serviceDurationMinutes = row.service_duration_minutes;
  const servicePriceCents = row.service_price_cents;

  if (
    typeof id !== "string" ||
    status === null ||
    !isIsoTimestamp(startsAt) ||
    !isIsoTimestamp(endsAt) ||
    typeof customerName !== "string" ||
    typeof customerPhone !== "string" ||
    typeof serviceId !== "string" ||
    typeof serviceName !== "string" ||
    !isFiniteNumber(serviceDurationMinutes) ||
    !isFiniteNumber(servicePriceCents)
  ) {
    return null;
  }

  return {
    id,
    status,
    startsAt,
    endsAt,
    customerName,
    customerPhone,
    serviceId,
    serviceName,
    serviceDurationMinutes,
    servicePriceCents,
  };
}

function sortByStart(
  appointments: readonly AdminAppointment[],
): AdminAppointment[] {
  return [...appointments].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

/** Una fila de `admin_get_appointment`. Devuelve `null` si la forma no cuadra. */
export function parseAdminAppointment(data: unknown): AdminAppointment | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return parseAdminAppointmentRow(data[0]);
}

/** Filas de `admin_get_agenda`, descartando las que no tengan la forma esperada. */
export function parseAdminAppointments(data: unknown): AdminAppointment[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const appointments: AdminAppointment[] = [];

  for (const row of data) {
    const appointment = parseAdminAppointmentRow(row);

    if (appointment) {
      appointments.push(appointment);
    }
  }

  return sortByStart(appointments);
}

/** Resultado de `admin_create_appointment`. */
export function parseAdminCreatedAppointment(
  data: unknown,
): AdminCreatedAppointment | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row: unknown = data[0];

  if (!isRecord(row)) {
    return null;
  }

  const { appointment_id: id, starts_at: startsAt, ends_at: endsAt } = row;

  if (
    typeof id !== "string" ||
    !isIsoTimestamp(startsAt) ||
    !isIsoTimestamp(endsAt)
  ) {
    return null;
  }

  return { id, startsAt, endsAt };
}

/** Resultado de `admin_set_appointment_status`. */
export function parseAdminStatusUpdate(
  data: unknown,
): AdminStatusUpdate | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row: unknown = data[0];

  if (!isRecord(row)) {
    return null;
  }

  const id = row.appointment_id;
  const status = parseAppointmentStatus(row.status);

  if (typeof id !== "string" || status === null) {
    return null;
  }

  return { id, status };
}

// ---------------------------------------------------------------------------
// Presentación
// ---------------------------------------------------------------------------

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
};

/** Etiqueta en español del estado de una cita. */
export function appointmentStatusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_LABELS[status];
}

/** Opciones para los botones de cambio de estado del detalle. */
export const APPOINTMENT_STATUS_OPTIONS: readonly {
  value: AppointmentStatus;
  label: string;
}[] = [
  { value: "confirmed", label: APPOINTMENT_STATUS_LABELS.confirmed },
  { value: "completed", label: APPOINTMENT_STATUS_LABELS.completed },
  { value: "no_show", label: APPOINTMENT_STATUS_LABELS.no_show },
  { value: "cancelled", label: APPOINTMENT_STATUS_LABELS.cancelled },
];

export type AdminDayGroup = {
  /** Fecha local del negocio, `YYYY-MM-DD`. */
  date: string;
  /** `jueves 19 de noviembre`. */
  label: string;
  isToday: boolean;
  appointments: AdminAppointment[];
};

/**
 * Agrupa la agenda por día local de Costa Rica. Los días y las citas salen
 * ordenados de forma ascendente.
 */
export function groupAppointmentsByDay(
  appointments: readonly AdminAppointment[],
  now: Date = new Date(),
): AdminDayGroup[] {
  const today = todayInBusinessTimezone(now);
  const groups = new Map<string, AdminAppointment[]>();

  for (const appointment of appointments) {
    const date = localDateOf(appointment.startsAt);
    const group = groups.get(date) ?? [];
    group.push(appointment);
    groups.set(date, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, group]) => ({
      date,
      label: formatLongDate(date),
      isToday: date === today,
      appointments: sortByStart(group),
    }));
}

export type AdminAgendaSummary = {
  /** Citas no canceladas de hoy. */
  today: number;
  /** Citas no canceladas de hoy a los próximos 6 días. */
  week: number;
};

/**
 * Resumen "hoy/semana" de la agenda. No cuenta las citas canceladas porque
 * liberan su bloque.
 */
export function summarizeAgenda(
  appointments: readonly AdminAppointment[],
  now: Date = new Date(),
): AdminAgendaSummary {
  const today = todayInBusinessTimezone(now);
  const weekEnd = addDays(today, 6);

  let todayCount = 0;
  let weekCount = 0;

  for (const appointment of appointments) {
    if (appointment.status === "cancelled") {
      continue;
    }

    const date = localDateOf(appointment.startsAt);

    if (date === today) {
      todayCount += 1;
    }

    if (date >= today && date <= weekEnd) {
      weekCount += 1;
    }
  }

  return { today: todayCount, week: weekCount };
}

/** La cita ya empezó. */
export function isAppointmentPast(
  appointment: AdminAppointment,
  now: Date = new Date(),
): boolean {
  const startsAt = new Date(appointment.startsAt).getTime();
  return !Number.isNaN(startsAt) && startsAt <= now.getTime();
}

/** La cita ya terminó (no se puede agendar, pero sí cambiar su estado). */
export function isAppointmentFinished(
  appointment: AdminAppointment,
  now: Date = new Date(),
): boolean {
  const endsAt = new Date(appointment.endsAt).getTime();
  return !Number.isNaN(endsAt) && endsAt <= now.getTime();
}

/** `08:30 a 09:00`, en hora de Costa Rica. */
export function formatAdminAppointmentTime(
  appointment: AdminAppointment,
): string {
  return formatSlotRange({
    start: appointment.startsAt,
    end: appointment.endsAt,
  });
}

/** `jueves 19 de noviembre`, en hora de Costa Rica. */
export function formatAdminAppointmentDate(
  appointment: AdminAppointment,
): string {
  return formatLongDate(localDateOf(appointment.startsAt));
}

/** Ruta del detalle de una cita en el panel. */
export function adminAppointmentHref(id: string): string {
  return `/admin/citas/${id}`;
}
