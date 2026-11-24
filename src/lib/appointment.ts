/** Estados posibles de una cita en la base de datos. */
export type AppointmentStatus =
  "confirmed" | "cancelled" | "completed" | "no_show";

/**
 * Cita pública tal como la devuelve `get_appointment_by_token`. El teléfono y
 * el nombre solo se exponen al portador del token del enlace.
 */
export type PublicAppointment = {
  id: string;
  status: AppointmentStatus;
  /** ISO en UTC. */
  startsAt: string;
  /** ISO en UTC. */
  endsAt: string;
  customerName: string;
  customerPhone: string;
  service: {
    name: string;
    durationMinutes: number;
    priceCents: number;
  };
  business: {
    name: string;
    whatsappPhone: string;
    address: string | null;
    currency: string;
    timezone: string;
  };
};

/**
 * Tokens del enlace de cancelación: UUID v4 como los que genera
 * `gen_random_uuid()` en la base de datos.
 */
const APPOINTMENT_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Comprueba el formato del token antes de llamar a la base de datos. */
export function isAppointmentToken(value: string): boolean {
  return APPOINTMENT_TOKEN_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** Convierte el valor crudo de la base de datos en un estado válido. */
export function parseAppointmentStatus(
  value: unknown,
): AppointmentStatus | null {
  switch (value) {
    case "confirmed":
    case "cancelled":
    case "completed":
    case "no_show":
      return value;
    default:
      return null;
  }
}

function parseService(value: unknown): PublicAppointment["service"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const { name, durationMinutes, priceCents } = value;

  if (
    typeof name !== "string" ||
    typeof durationMinutes !== "number" ||
    !Number.isFinite(durationMinutes) ||
    typeof priceCents !== "number" ||
    !Number.isFinite(priceCents)
  ) {
    return null;
  }

  return { name, durationMinutes, priceCents };
}

function parseBusiness(value: unknown): PublicAppointment["business"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const { name, whatsappPhone, address, currency, timezone } = value;

  if (
    typeof name !== "string" ||
    typeof whatsappPhone !== "string" ||
    typeof currency !== "string" ||
    typeof timezone !== "string" ||
    (address !== null && typeof address !== "string")
  ) {
    return null;
  }

  return {
    name,
    whatsappPhone,
    address: typeof address === "string" ? address : null,
    currency,
    timezone,
  };
}

/**
 * Valida la respuesta de `get_appointment_by_token` (una fila como máximo).
 * Devuelve `null` si el token no existe o si la forma no es la esperada.
 */
export function parsePublicAppointment(
  data: unknown,
): PublicAppointment | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row: unknown = data[0];
  if (!isRecord(row)) {
    return null;
  }

  const id = row.appointment_id;
  const status = parseAppointmentStatus(row.status);
  const startsAt = row.starts_at;
  const endsAt = row.ends_at;
  const customerName = row.customer_name;
  const customerPhone = row.customer_phone;

  if (
    typeof id !== "string" ||
    status === null ||
    !isIsoTimestamp(startsAt) ||
    !isIsoTimestamp(endsAt) ||
    typeof customerName !== "string" ||
    typeof customerPhone !== "string"
  ) {
    return null;
  }

  const service = parseService({
    name: row.service_name,
    durationMinutes: row.service_duration_minutes,
    priceCents: row.service_price_cents,
  });
  const business = parseBusiness({
    name: row.business_name,
    whatsappPhone: row.business_whatsapp,
    address: row.business_address,
    currency: row.business_currency,
    timezone: row.business_timezone,
  });

  if (!service || !business) {
    return null;
  }

  return {
    id,
    status,
    startsAt,
    endsAt,
    customerName,
    customerPhone,
    service,
    business,
  };
}

/**
 * El cliente puede cancelar mientras la cita siga confirmada y no haya
 * empezado. La base de datos vuelve a comprobarlo al cancelar.
 */
export function isCancelable(
  appointment: PublicAppointment,
  now: Date = new Date(),
): boolean {
  if (appointment.status !== "confirmed") {
    return false;
  }

  const startsAt = new Date(appointment.startsAt).getTime();
  return !Number.isNaN(startsAt) && startsAt > now.getTime();
}

/** La cita ya fue cancelada: no se puede volver a cancelar. */
export function isCancelled(appointment: PublicAppointment): boolean {
  return appointment.status === "cancelled";
}
