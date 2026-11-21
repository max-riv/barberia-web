import {
  addDays,
  formatLongDate,
  formatSlotTime,
  localDateOf,
  normalizeCostaRicaPhone,
  todayInBusinessTimezone,
} from "@/lib/booking";

export type WhatsAppLinkInput = {
  /** Teléfono en cualquier formato; se normaliza a E.164. */
  phone: string;
  /** Texto prellenado del chat. Si falta, el enlace abre la conversación. */
  message?: string;
};

/**
 * Enlace `wa.me` con el teléfono normalizado y el mensaje codificado.
 * WhatsApp espera solo dígitos: `+50687677997` → `50687677997`.
 */
export function buildWhatsAppLink({
  phone,
  message,
}: WhatsAppLinkInput): string {
  const normalized = normalizeCostaRicaPhone(phone);
  const digits = (normalized ?? phone).replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  const text = (message ?? "").trim();

  return text.length > 0 ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export type AppointmentMessageInput = {
  /** Con quién habla el cliente en la barbería, por ejemplo "Chata". */
  businessContactName: string;
  customerName: string;
  /** Inicio de la cita en ISO (UTC). */
  startsAt: string;
  /** Inyectable en pruebas: instante desde el que se calcula hoy/mañana. */
  now?: Date;
};

/**
 * Mensaje prellenado para confirmar la cita por WhatsApp:
 * `Hola Chata, reservé un corte para el jueves 26 de noviembre a las 10:00 a
 * nombre de Ana. ¿Me lo confirmas?`
 *
 * Si la cita es hoy o mañana usa "hoy"/"mañana" en vez de la fecha larga.
 */
export function buildAppointmentMessage({
  businessContactName,
  customerName,
  startsAt,
  now = new Date(),
}: AppointmentMessageInput): string {
  const date = localDateOf(startsAt);
  const today = todayInBusinessTimezone(now);

  const day =
    date === today
      ? "hoy"
      : date === addDays(today, 1)
        ? "mañana"
        : `el ${formatLongDate(date)}`;

  const time = formatSlotTime(startsAt);

  return `Hola ${businessContactName}, reservé un corte para ${day} a las ${time} a nombre de ${customerName}. ¿Me lo confirmas?`;
}
