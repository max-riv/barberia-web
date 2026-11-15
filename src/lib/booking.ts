import { BUSINESS_TIMEZONE } from "@/lib/env";

/** Cada cita ocupa 30 minutos, alineados a :00 y :30. */
export const SLOT_MINUTES = 30;
/** Se puede reservar desde hoy hasta dentro de 30 días. */
export const BOOKING_WINDOW_DAYS = 30;
/** Límite de citas futuras por teléfono (lo aplica la base de datos). */
export const MAX_ACTIVE_APPOINTMENTS = 3;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SPANISH_LOCALE = "es-CR";

export type BookingSlot = {
  start: string;
  end: string;
};

export type BookedAppointment = {
  id: string;
  token: string;
  startsAt: string;
  endsAt: string;
};

export type DateOption = {
  /** Fecha local del negocio, `YYYY-MM-DD`. */
  date: string;
  weekday: string;
  day: string;
  month: string;
  isToday: boolean;
};

export type ScheduleRow = {
  weekday: number;
  startTime: string;
  endTime: string;
};

// ---------------------------------------------------------------------------
// Fechas (siempre en America/Costa_Rica)
// ---------------------------------------------------------------------------

function startOfUtcDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Comprueba que sea una fecha `YYYY-MM-DD` que exista en el calendario. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const date = startOfUtcDate(value);
  return !Number.isNaN(date.getTime()) && formatIsoDate(date) === value;
}

/** Hoy según el reloj del negocio, no el del servidor. */
export function todayInBusinessTimezone(now: Date = new Date()): string {
  return localDateOf(now.toISOString());
}

/** Fecha local del negocio (`YYYY-MM-DD`) de un instante dado. */
export function localDateOf(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));

  const lookup = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${lookup("year")}-${lookup("month")}-${lookup("day")}`;
}

export function addDays(isoDate: string, days: number): string {
  const date = startOfUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

/** Día de la semana: 0 = domingo … 6 = sábado. */
export function weekdayOf(isoDate: string): number {
  return startOfUtcDate(isoDate).getUTCDay();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function weekdayLabel(date: Date): string {
  const label = new Intl.DateTimeFormat(SPANISH_LOCALE, {
    timeZone: "UTC",
    weekday: "short",
  }).format(date);

  return capitalize(label.replace(/\.$/, ""));
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat(SPANISH_LOCALE, {
    timeZone: "UTC",
    month: "short",
  })
    .format(date)
    .replace(/\.$/, "");
}

/**
 * Días seleccionables: desde hoy hasta dentro de 30 días, solo los que tienen
 * horario de atención. Los miércoles, por ejemplo, no aparecen.
 */
export function buildDateOptions(params: {
  today: string;
  openWeekdays: readonly number[];
  windowDays?: number;
}): DateOption[] {
  const { today, openWeekdays } = params;
  const windowDays = params.windowDays ?? BOOKING_WINDOW_DAYS;
  const open = new Set(openWeekdays);
  const base = startOfUtcDate(today);
  const options: DateOption[] = [];

  for (let offset = 0; offset <= windowDays; offset += 1) {
    const date = new Date(base);
    date.setUTCDate(date.getUTCDate() + offset);

    if (!open.has(date.getUTCDay())) {
      continue;
    }

    options.push({
      date: formatIsoDate(date),
      weekday: weekdayLabel(date),
      day: String(date.getUTCDate()),
      month: monthLabel(date),
      isToday: offset === 0,
    });
  }

  return options;
}

/** `2026-11-19` → `jueves 19 de noviembre`. */
export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat(SPANISH_LOCALE, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(startOfUtcDate(isoDate));
}

// ---------------------------------------------------------------------------
// Horas
// ---------------------------------------------------------------------------

const SLOT_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** ISO en UTC → `08:30` en hora de Costa Rica. */
export function formatSlotTime(iso: string): string {
  return SLOT_TIME_FORMATTER.format(new Date(iso));
}

/** ISO en UTC → `08:30 a 09:00`. */
export function formatSlotRange(slot: BookingSlot): string {
  return `${formatSlotTime(slot.start)} a ${formatSlotTime(slot.end)}`;
}

function slotHour(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

/** Separa los espacios en mañana y tarde (el descanso cae en el hueco). */
export function groupSlots(slots: readonly BookingSlot[]): {
  morning: BookingSlot[];
  afternoon: BookingSlot[];
} {
  const morning: BookingSlot[] = [];
  const afternoon: BookingSlot[] = [];

  for (const slot of slots) {
    if (slotHour(slot.start) < 12) {
      morning.push(slot);
    } else {
      afternoon.push(slot);
    }
  }

  return { morning, afternoon };
}

// ---------------------------------------------------------------------------
// Horario del negocio
// ---------------------------------------------------------------------------

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function joinWithY(parts: readonly string[]): string {
  if (parts.length <= 1) {
    return parts.join("");
  }

  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

/** `08:00:00` → `08:00`. */
function shortTime(value: string): string {
  return value.slice(0, 5);
}

/** Resume los tramos de `working_hours` para mostrarlos en la portada. */
export function describeSchedule(rows: readonly ScheduleRow[]): {
  days: string;
  hours: string;
} {
  if (rows.length === 0) {
    return { days: "Horario por confirmar", hours: "" };
  }

  const openWeekdays = new Set(rows.map((row) => row.weekday));
  const days = joinWithY(
    WEEKDAY_ORDER.filter((weekday) => openWeekdays.has(weekday)).map(
      (weekday) => WEEKDAY_NAMES[weekday],
    ),
  );

  const tramos = new Map<string, string>();
  for (const row of rows) {
    const label = `${shortTime(row.startTime)} a ${shortTime(row.endTime)}`;
    tramos.set(label, label);
  }

  const hours = joinWithY([...tramos.keys()].sort());

  return { days, hours };
}

// ---------------------------------------------------------------------------
// Datos del cliente
// ---------------------------------------------------------------------------

/** Nombre listo para guardar, o `null` si no es válido. */
export function normalizeCustomerName(
  raw: string | null | undefined,
): string | null {
  const value = (raw ?? "").replace(/\s+/g, " ").trim();

  if (value.length < 2 || value.length > 80) {
    return null;
  }

  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return null;
  }

  return value;
}

/**
 * Normaliza teléfonos a E.164. Misma lógica que `normalize_cr_phone` en SQL:
 * `8767 7997`, `50687677997` y `+50687677997` dan `+50687677997`.
 */
export function normalizeCostaRicaPhone(
  raw: string | null | undefined,
): string | null {
  if (!raw) {
    return null;
  }

  const compact = raw.replace(/[^0-9+]/g, "");

  if (/^\+506\d{8}$/.test(compact)) {
    return compact;
  }

  if (/^506\d{8}$/.test(compact)) {
    return `+${compact}`;
  }

  if (/^[678]\d{7}$/.test(compact)) {
    return `+506${compact}`;
  }

  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  return null;
}

/** `+50687677997` → `+506 8767 7997`. */
export function formatPhoneForDisplay(phone: string): string {
  if (/^\+506\d{8}$/.test(phone)) {
    return `+506 ${phone.slice(4, 8)} ${phone.slice(8)}`;
  }

  return phone;
}

/**
 * Reconstruye un espacio a partir del instante de inicio (`?hora=`). Sirve para
 * mantener el formulario montado después de reservar, cuando el espacio ya no
 * aparece en la lista de disponibles.
 */
export function slotFromStart(
  start: string | null | undefined,
): BookingSlot | null {
  if (!start) {
    return null;
  }

  const startsAt = new Date(start);

  if (Number.isNaN(startsAt.getTime())) {
    return null;
  }

  const endsAt = new Date(startsAt.getTime() + SLOT_MINUTES * 60_000);

  return { start: startsAt.toISOString(), end: endsAt.toISOString() };
}

/** Enlace interno a la página de reserva para una fecha y, si hay, una hora. */
export function bookingHref(date: string, start?: string): string {
  const params = new URLSearchParams({ fecha: date });

  if (start) {
    params.set("hora", start);
  }

  return `/reservar?${params.toString()}`;
}

/**
 * `price_cents` en colones: 600000 → `₡6.000`. Se agrupa a mano para que el
 * resultado no dependa del ICU del servidor.
 */
export function formatPrice(cents: number, currency = "CRC"): string {
  const amount = Math.round(cents / 100);
  const grouped = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return currency === "CRC" ? `₡${grouped}` : `${grouped} ${currency}`;
}

// ---------------------------------------------------------------------------
// Respuestas de Supabase
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** Valida y ordena lo que devuelve `get_available_slots`. */
export function parseSlots(data: unknown): BookingSlot[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const slots: BookingSlot[] = [];

  for (const row of data) {
    if (!isRecord(row)) {
      continue;
    }

    const start = row.slot_start;
    const end = row.slot_end;

    if (!isIsoTimestamp(start) || !isIsoTimestamp(end)) {
      continue;
    }

    slots.push({ start, end });
  }

  return slots.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}

/** Valida lo que devuelve `book_appointment` (una sola fila). */
export function parseBookedAppointment(
  data: unknown,
): BookedAppointment | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row: unknown = data[0];
  if (!isRecord(row)) {
    return null;
  }

  const id = row.appointment_id;
  const token = row.cancel_token;
  const startsAt = row.starts_at;
  const endsAt = row.ends_at;

  if (
    typeof id !== "string" ||
    typeof token !== "string" ||
    !isIsoTimestamp(startsAt) ||
    !isIsoTimestamp(endsAt)
  ) {
    return null;
  }

  return { id, token, startsAt, endsAt };
}
