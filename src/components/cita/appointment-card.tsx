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
      <dt className="text-xs font-bold tracking-[0.13em] text-ink-soft uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm leading-relaxed font-medium break-words text-ink">
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
    <article className="urban-card relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-copper"
      />
      <p className="text-xs font-bold tracking-[0.16em] text-copper uppercase">
        Fecha y hora
      </p>
      <p className="mt-3 font-display text-3xl leading-[1.02] font-bold text-balance uppercase sm:text-4xl">
        {date}
      </p>
      <p className="mt-2 text-lg font-semibold text-[#d4d4d4] tabular-nums">
        {formatSlotRange({
          start: appointment.startsAt,
          end: appointment.endsAt,
        })}
      </p>

      <dl className="mt-6 grid gap-x-6 gap-y-5 border-t border-line pt-5 sm:grid-cols-2">
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
            className="inline-flex min-h-11 items-center rounded underline decoration-copper underline-offset-4"
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
