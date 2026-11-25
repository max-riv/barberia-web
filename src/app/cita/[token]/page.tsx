import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppointmentCard } from "@/components/cita/appointment-card";
import { CancelAppointmentForm } from "@/components/cita/cancel-appointment-form";
import { StatusBadge } from "@/components/cita/status-badge";
import { SiteHeader } from "@/components/site-header";
import {
  isAppointmentToken,
  isCancelable,
  isCancelled,
} from "@/lib/appointment";
import { loadPublicAppointment } from "@/lib/appointment-data";
import { buildAppointmentMessage, buildWhatsAppLink } from "@/lib/whatsapp";

// La cita sale de Supabase y cambia al cancelar: nunca se prerenderiza.
export const dynamic = "force-dynamic";

const PRIMARY_LINK =
  "inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-copper px-6 text-center text-base font-bold text-sand transition-colors active:bg-copper-dark";
const SECONDARY_LINK =
  "inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-line bg-surface px-6 text-center text-sm font-bold text-ink transition-colors active:border-copper active:bg-panel";

export async function generateMetadata(): Promise<Metadata> {
  // La URL es la llave de la cita: nada de nombres ni fechas en la vista previa.
  return {
    title: "Tu cita",
    description: "Consulta o cancela tu cita en Charlie's Barbershop",
    robots: { index: false, follow: false },
    openGraph: {
      title: "Tu cita",
      description: "Consulta o cancela tu cita en Charlie's Barbershop",
      type: "website",
    },
  };
}

export default async function CitaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isAppointmentToken(token)) {
    notFound();
  }

  const appointment = await loadPublicAppointment(token);

  if (!appointment) {
    notFound();
  }

  const now = new Date();
  const cancelable = isCancelable(appointment, now);
  const cancelled = isCancelled(appointment);
  const isPast = appointment.status === "confirmed" && !cancelable;

  const confirmLink = buildWhatsAppLink({
    phone: appointment.business.whatsappPhone,
    message: buildAppointmentMessage({
      businessContactName: "Chata",
      customerName: appointment.customerName,
      startsAt: appointment.startsAt,
    }),
  });
  const contactLink = buildWhatsAppLink({
    phone: appointment.business.whatsappPhone,
  });

  let heading = "Tu cita está confirmada";
  let intro =
    "Guarda este enlace: es tu llave para cancelar hasta el inicio de la cita.";

  if (cancelled) {
    heading = "Esta cita está cancelada";
    intro =
      "El espacio quedó libre para otra persona. Si quieres, reserva una nueva hora.";
  } else if (appointment.status === "completed") {
    heading = "Cita completada";
    intro = "Gracias por pasar por la barbería. Este es el resumen de tu cita.";
  } else if (appointment.status === "no_show") {
    heading = "Cita no asistida";
    intro =
      "La cita quedó registrada como no asistida. Si necesitas otra hora, escríbenos.";
  } else if (isPast) {
    heading = "Esta cita ya pasó";
    intro =
      "La fecha de tu cita quedó atrás. Escríbenos por WhatsApp para buscar otro horario.";
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader businessName={appointment.business.name} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 sm:px-6">
        <section className="pt-8 pb-7 sm:pt-12" aria-labelledby="cita-titulo">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">Tu cita</p>
            <StatusBadge status={appointment.status} isPast={isPast} />
          </div>
          <h1
            id="cita-titulo"
            className="mt-4 text-5xl leading-[0.92] text-balance uppercase sm:text-6xl"
          >
            {heading}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
            {intro}
          </p>
        </section>

        <AppointmentCard appointment={appointment} />

        <section className="mt-6" aria-label="Acciones de tu cita">
          {cancelable ? (
            <>
              <a
                href={confirmLink}
                target="_blank"
                rel="noopener noreferrer"
                className={PRIMARY_LINK}
              >
                Confirmar por WhatsApp
              </a>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Se abre el chat con Chata y el mensaje listo para enviar.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a
                  href={`/api/cita/${token}/cita.ics`}
                  className={SECONDARY_LINK}
                >
                  Agregar al calendario
                </a>
                <CancelAppointmentForm token={token} />
              </div>

              <p className="mt-4 text-xs leading-relaxed text-ink-soft">
                Puedes cancelar desde este mismo enlace hasta la hora de inicio.
                Después, escríbenos por WhatsApp.
              </p>
            </>
          ) : cancelled ? (
            <>
              <Link href="/reservar" className={PRIMARY_LINK}>
                Reservar otra cita
              </Link>
              <a
                href={contactLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${SECONDARY_LINK} mt-3`}
              >
                Escríbenos por WhatsApp
              </a>
            </>
          ) : (
            <>
              <a
                href={contactLink}
                target="_blank"
                rel="noopener noreferrer"
                className={PRIMARY_LINK}
              >
                Escríbenos por WhatsApp
              </a>
              <Link href="/reservar" className={`${SECONDARY_LINK} mt-3`}>
                Reservar otra cita
              </Link>
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-line/70 bg-[#0d0d0d]">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/"
            className="inline-flex min-h-11 w-fit items-center rounded font-semibold text-ink underline decoration-copper underline-offset-4"
          >
            Volver al inicio
          </Link>
          <p>Horario de Costa Rica (UTC−6).</p>
        </div>
      </footer>
    </div>
  );
}
