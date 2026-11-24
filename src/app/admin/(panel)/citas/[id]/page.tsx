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
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep";

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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cita de {appointment.customerName}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {formatAdminAppointmentDate(appointment)}
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-white/70 p-5">
        <dl className="space-y-4 border-t border-line/70 pt-4 sm:grid sm:grid-cols-2 sm:gap-6">
          <AdminDetail label="Fecha y hora">
            {formatAdminAppointmentDate(appointment)} ·{" "}
            {formatAdminAppointmentTime(appointment)}
          </AdminDetail>
          <AdminDetail label="Servicio">
            {appointment.serviceName} · {appointment.serviceDurationMinutes} min
            · {formatPrice(appointment.servicePriceCents)}
          </AdminDetail>
          <AdminDetail label="Estado">
            <StatusBadge status={appointment.status} isPast={isPast} />
          </AdminDetail>
          <AdminDetail label="Teléfono">
            <a
              href={`tel:${appointment.customerPhone}`}
              className="rounded underline decoration-line underline-offset-4"
            >
              {formatPhoneForDisplay(appointment.customerPhone)}
            </a>
          </AdminDetail>
        </dl>
      </section>

      <div className="flex flex-col gap-2">
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
          className={BUTTON_CLASS}
        >
          Escríbenos por WhatsApp
        </a>
        <Link
          href="/admin"
          className="text-center text-sm text-ink-soft hover:underline"
        >
          Volver a la agenda
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-ink">Estado de la cita</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Cualquier estado puede cambiarse a cualquier otro.
        </p>
        <div className="mt-3">
          <StatusChangeForm
            appointmentId={appointment.id}
            initialStatus={appointment.status}
          />
        </div>
      </section>
    </div>
  );
}
