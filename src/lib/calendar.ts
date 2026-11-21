export type IcsEventInput = {
  /** Identificador estable del evento (suele ser el id de la cita). */
  uid: string;
  /** Inicio en ISO (UTC). */
  startsAt: string;
  /** Fin en ISO (UTC). */
  endsAt: string;
  summary: string;
  location?: string | null;
  description?: string | null;
  /** Inyectable en pruebas: instante para `DTSTAMP`. */
  now?: Date;
};

const CRLF = "\r\n";
/** RFC 5545: ninguna línea debe superar los 75 octetos. */
const LINE_OCTET_LIMIT = 75;
const encoder = new TextEncoder();

/** Escapa los caracteres especiales de un valor de texto iCalendar. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** Fecha UTC en el formato compacto de iCalendar: `20261119T140000Z`. */
function formatUtc(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha inválida para el evento de calendario");
  }

  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

/**
 * Pliega una línea en trozos de 75 octetos como máximo. Las continuaciones
 * empiezan con un espacio y tampoco se cortan dentro de un carácter UTF-8.
 */
function foldLine(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  let currentOctets = 0;

  for (const character of line) {
    const octets = encoder.encode(character).length;

    if (currentOctets + octets > LINE_OCTET_LIMIT) {
      parts.push(current);
      // La línea de continuación empieza con un espacio, que cuenta dentro
      // del límite de 75 octetos.
      current = " ";
      currentOctets = 1;
    }

    current += character;
    currentOctets += octets;
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
}

/**
 * Construye un `.ics` con un único evento, listo para descargar. No depende de
 * ninguna librería: CRLF, fechas UTC, escapado y plegado según RFC 5545.
 */
export function buildIcsEvent({
  uid,
  startsAt,
  endsAt,
  summary,
  location,
  description,
  now = new Date(),
}: IcsEventInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Charlie's Barbershop//Citas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(uid)}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(startsAt)}`,
    `DTEND:${formatUtc(endsAt)}`,
    `SUMMARY:${escapeText(summary)}`,
  ];

  if (location) {
    lines.push(`LOCATION:${escapeText(location)}`);
  }

  if (description) {
    lines.push(`DESCRIPTION:${escapeText(description)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return `${lines.flatMap(foldLine).join(CRLF)}${CRLF}`;
}
