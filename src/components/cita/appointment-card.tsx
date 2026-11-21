import type { PublicAppointment } from "@/lib/appointment";
import {
  formatLongDate,
  formatPhoneForDisplay,
  formatPrice,
  formatSlotRange,
  localDateOf,
} from "@/lib/booking";

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.12em] text-ink-soft uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-relaxed font-medium break-words text-ink">
        {children}
      </dd>
    </div>
  );
}

/** Resumen de la cita: fecha, hora, servicio y datos del cliente. */
export function AppointmentCard({
  appointment,
}: {
  appointment: PublicAppointment;
}) {
  const date = capitalizeFirst(
    formatLongDate(localDateOf(appointment.startsAt)),
  );

  return (
    <article className="rounded-2xl border border-line bg-white/60 p-5">
      <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">
        Fecha y hora
      </p>
      <p className="mt-2 text-2xl leading-tight font-semibold tracking-tight text-balance">
        {date}
      </p>
      <p className="mt-1.5 text-base font-medium text-ink-soft">
        {formatSlotRange({
          start: appointment.startsAt,
          end: appointment.endsAt,
        })}
      </p>

      <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-line/70 pt-4 sm:grid-cols-2">
        <Detail label="Servicio">
          {appointment.service.name} · {appointment.service.durationMinutes} min
          ·{" "}
          {formatPrice(
            appointment.service.priceCents,
            appointment.business.currency,
          )}
        </Detail>

        <Detail label="A nombre de">{appointment.customerName}</Detail>

        <Detail label="Teléfono">
          <a
            href={`tel:${appointment.customerPhone}`}
            className="rounded underline decoration-line underline-offset-4"
          >
            {formatPhoneForDisplay(appointment.customerPhone)}
          </a>
        </Detail>

        {appointment.business.address ? (
          <Detail label="Dirección">{appointment.business.address}</Detail>
        ) : null}
      </dl>
    </article>
  );
}
