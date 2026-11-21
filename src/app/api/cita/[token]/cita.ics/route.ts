import { loadPublicAppointment } from "@/lib/appointment-data";
import { buildIcsEvent } from "@/lib/calendar";

const NO_STORE = "no-store";

function notFound(): Response {
  return new Response("Cita no encontrada", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": NO_STORE,
    },
  });
}

/**
 * Origen real de la petición: `host` + `x-forwarded-proto` (Netlify los envía).
 * Sin dominio hardcodeado; si faltan, se usa la URL de la petición.
 */
function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("host")?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : url.protocol.replace(":", "");

  return host ? `${protocol}://${host}` : url.origin;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const appointment = await loadPublicAppointment(token);

  if (!appointment) {
    return notFound();
  }

  const cancelUrl = `${requestOrigin(request)}/cita/${token}`;

  const description = [
    `Cita en ${appointment.business.name}.`,
    `Servicio: ${appointment.service.name} (${appointment.service.durationMinutes} min).`,
    appointment.business.address
      ? `Dirección: ${appointment.business.address}.`
      : null,
    `Para cancelar, abre: ${cancelUrl}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const calendar = buildIcsEvent({
    uid: appointment.id,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    summary: `${appointment.service.name} · ${appointment.business.name}`,
    location: appointment.business.address ?? appointment.business.name,
    description,
  });

  return new Response(calendar, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="cita-charlies-barbershop.ics"',
      "Cache-Control": NO_STORE,
    },
  });
}
