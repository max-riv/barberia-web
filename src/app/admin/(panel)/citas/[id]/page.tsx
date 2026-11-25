import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDetail } from "@/components/admin/admin-detail";
import { StatusChangeForm } from "@/components/admin/status-change-form";
import { StatusBadge } from "@/components/cita/status-badge";
import {
  formatAdminAppointmentDate,
  formatAdminAppointmentTime,
  isAppointmentPast,
  isUuid,
} from "@/lib/admin";
import { loadAdminAppointment } from "@/lib/admin-data";
import {
  formatPhoneForDisplay,
  formatPrice,
  formatSlotTime,
} from "@/lib/booking";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const BUTTON_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-bold text-ink transition-colors active:border-copper active:bg-panel";

export default async function CitasDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const appointment = await loadAdminAppointment(id);

  if (!appointment) {
    notFound();
  }

  const isPast = isAppointmentPast(appointment);

  // Mensaje propio del barbero, en español: es para la conversación del
  // barbero con el cliente, no el aviso de confirmación del cliente.
  const whatsappMessage = `Hola, estoy mirando mi cita a las ${formatSlotTime(appointment.startsAt)}. ¿Me lo puedes confirmar?`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="eyebrow">Detalle de cita</p>
        <h1 className="mt-3 text-4xl leading-none text-balance uppercase sm:text-5xl">
          Cita de {appointment.customerName}
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          {formatAdminAppointmentDate(appointment)}
        </p>
      </div>

      <section className="urban-card p-5 sm:p-6">
        <dl className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          <AdminDetail label="Fecha y hora">
            {formatAdminAppointmentDate(appointment)} ·{" "}
            {formatAdminAppointmentTime(appointment)}
          </AdminDetail>
          <AdminDetail label="Servicio">
            {appointment.serviceName} · {appointment.serviceDurationMinutes} min
            · {formatPrice(appointment.servicePriceCents)}
          </AdminDetail>
          <AdminDetail label="Estado">
            <span className="mt-1 inline-flex">
              <StatusBadge status={appointment.status} isPast={isPast} />
            </span>
          </AdminDetail>
          <AdminDetail label="Teléfono">
            <a
              href={`tel:${appointment.customerPhone}`}
              className="inline-flex min-h-11 items-center rounded underline decoration-copper underline-offset-4"
            >
              {formatPhoneForDisplay(appointment.customerPhone)}
            </a>
          </AdminDetail>
        </dl>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href={`tel:${appointment.customerPhone}`} className={BUTTON_CLASS}>
          Llamar
        </a>
        <a
          href={buildWhatsAppLink({
            phone: appointment.customerPhone,
            message: whatsappMessage,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BUTTON_CLASS} border-copper/60 text-copper`}
        >
          Escribir por WhatsApp
        </a>
      </div>

      <section className="urban-card p-5 sm:p-6">
        <h2 className="text-3xl text-ink uppercase">Estado de la cita</h2>
        <p className="mt-2 mb-4 text-sm text-ink-soft">
          Cualquier estado puede cambiarse a cualquier otro.
        </p>
        <StatusChangeForm
          appointmentId={appointment.id}
          initialStatus={appointment.status}
        />
      </section>

      <Link
        href="/admin"
        className="inline-flex min-h-12 items-center rounded text-sm font-semibold text-ink-soft underline decoration-line underline-offset-4"
      >
        Volver a la agenda
      </Link>
    </div>
  );
}
