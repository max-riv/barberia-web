import { formatLongDate, formatSlotRange, localDateOf } from "@/lib/booking";

/** Un tramo de atención de un día: horas `"HH:MM"` (por ejemplo 08:00–12:00). */
export type WorkingHoursRange = {
  start: string;
  end: string;
};

/** Los tramos de un día de la semana (0 = domingo … 6 = sábado). */
export type WorkingHoursDay = {
  weekday: number;
  ranges: WorkingHoursRange[];
};

/** Etiquetas de los días; índice 0..6 = domingo..sábado. */
export const WEEKDAY_LABELS: readonly string[] = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/** Orden del editor de horarios: lunes primero, domingo al final. */
export const WEEKDAY_EDITOR_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

/** Bloqueo del barbero tal como lo devuelve `admin_list_time_off`. */
export type AdminTimeOff = {
  id: string;
  /** ISO en UTC. */
  startsAt: string;
  /** ISO en UTC. */
  endsAt: string;
  reason: string | null;
  appointmentCount: number;
};

/** Cita confirmada que choca con un bloqueo que se quiere crear. */
export type TimeOffConflict = {
  /** ISO en UTC. */
  startsAt: string;
  /** ISO en UTC. */
  endsAt: string;
  customerName: string;
  customerPhone: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isWeekday(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  );
}

const TIME_OF_DAY_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/** `"08:00:00"` → `"08:00"` (PostgREST devuelve la hora completa). */
function shortTime(value: string): string {
  return value.slice(0, 5);
}

function compareRanges(a: WorkingHoursRange, b: WorkingHoursRange): number {
  return a.start.localeCompare(b.start);
}

/**
 * Valida las filas de un select sobre `working_hours` y las devuelve como los
 * 7 días de la semana, ordenados para el editor (lunes a domingo). Los días
 * sin tramos llegan con `ranges: []` y las filas malformadas se descartan.
 */
export function parseWorkingHours(data: unknown): WorkingHoursDay[] {
  const rangesByDay = new Map<number, WorkingHoursRange[]>();

  if (Array.isArray(data)) {
    for (const row of data) {
      if (!isRecord(row)) {
        continue;
      }

      const weekday = row.weekday;
      const startTime = row.start_time;
      const endTime = row.end_time;

      if (
        !isWeekday(weekday) ||
        typeof startTime !== "string" ||
        typeof endTime !== "string"
      ) {
        continue;
      }

      const start = shortTime(startTime);
      const end = shortTime(endTime);

      if (!TIME_OF_DAY_PATTERN.test(start) || !TIME_OF_DAY_PATTERN.test(end)) {
        continue;
      }

      if (start >= end) {
        continue;
      }

      const ranges = rangesByDay.get(weekday) ?? [];
      ranges.push({ start, end });
      rangesByDay.set(weekday, ranges);
    }
  }

  return WEEKDAY_EDITOR_ORDER.map((weekday) => ({
    weekday,
    ranges: (rangesByDay.get(weekday) ?? []).sort(compareRanges),
  }));
}

/** Filas de `admin_list_time_off`, descartando las malformadas. */
export function parseAdminTimeOffs(data: unknown): AdminTimeOff[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const timeOffs: AdminTimeOff[] = [];

  for (const row of data) {
    if (!isRecord(row)) {
      continue;
    }

    const id = row.time_off_id;
    const startsAt = row.starts_at;
    const endsAt = row.ends_at;
    const reason = row.reason;
    const appointmentCount = row.appointment_count;

    if (
      typeof id !== "string" ||
      !isIsoTimestamp(startsAt) ||
      !isIsoTimestamp(endsAt) ||
      (reason !== null && typeof reason !== "string") ||
      !isFiniteNumber(appointmentCount)
    ) {
      continue;
    }

    timeOffs.push({ id, startsAt, endsAt, reason, appointmentCount });
  }

  return timeOffs.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

/** El `conflicts` jsonb de `admin_create_time_off`, tal como lo armó la BD. */
export function parseTimeOffConflicts(value: unknown): TimeOffConflict[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const conflicts: TimeOffConflict[] = [];

  for (const row of value) {
    if (!isRecord(row)) {
      continue;
    }

    const startsAt = row.starts_at;
    const endsAt = row.ends_at;
    const customerName = row.customer_name;
    const customerPhone = row.customer_phone;

    if (
      !isIsoTimestamp(startsAt) ||
      !isIsoTimestamp(endsAt) ||
      typeof customerName !== "string" ||
      typeof customerPhone !== "string"
    ) {
      continue;
    }

    conflicts.push({ startsAt, endsAt, customerName, customerPhone });
  }

  return conflicts;
}

/** Una fila de `admin_create_time_off`; `null` si la forma no cuadra. */
export function parseTimeOffCreation(data: unknown): {
  timeOffId: string | null;
  created: boolean;
  conflicts: TimeOffConflict[];
} | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row: unknown = data[0];

  if (!isRecord(row)) {
    return null;
  }

  const created = row.created;
  const timeOffId = row.time_off_id;

  if (typeof created !== "boolean") {
    return null;
  }

  if (created && typeof timeOffId !== "string") {
    return null;
  }

  return {
    timeOffId: typeof timeOffId === "string" ? timeOffId : null,
    created,
    conflicts: parseTimeOffConflicts(row.conflicts),
  };
}

/** `jueves 26 de noviembre, 08:00 a 12:30`, en hora de Costa Rica. */
export function formatTimeOffRange(
  timeOff: Pick<AdminTimeOff, "startsAt" | "endsAt">,
): string {
  return `${formatLongDate(localDateOf(timeOff.startsAt))}, ${formatSlotRange({
    start: timeOff.startsAt,
    end: timeOff.endsAt,
  })}`;
}
