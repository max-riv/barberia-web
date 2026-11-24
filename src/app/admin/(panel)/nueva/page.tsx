import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateAppointmentForm } from "@/components/admin/create-appointment-form";
import { loadAdminServices, loadAdminSlots } from "@/lib/admin-data";
import {
  addDays,
  formatLongDate,
  isIsoDate,
  todayInBusinessTimezone,
  weekdayOf,
} from "@/lib/booking";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function NuevaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string | string[] }>;
}) {
  const params = await searchParams;
  const access = await getAdminAccess();

  if (access.status !== "ok") {
    redirect("/admin/login");
  }

  let fecha = todayInBusinessTimezone();

  // Miércoles → saltar al siguiente día hábil: el barbería está cerrada.
  if (weekdayOf(fecha) === 3) {
    fecha = addDays(fecha, 1);
  }

  const requested = Array.isArray(params.fecha)
    ? params.fecha[0]
    : params.fecha;

  if (typeof requested === "string" && isIsoDate(requested)) {
    fecha = requested;
  }

  const services = await loadAdminServices(access.barber.businessId);
  const slots = await loadAdminSlots(fecha);

  const showError = (message: string) => (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Nueva cita</h1>
      <p
        role="alert"
        className="rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-800"
      >
        {message}
      </p>
      <Link
        href="/admin"
        className="inline-flex min-h-12 items-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep"
      >
        Volver a la agenda
      </Link>
    </div>
  );

  if (services === null || slots === null) {
    return showError(
      "No pudimos cargar los datos del formulario. Inténtalo de nuevo en un momento.",
    );
  }

  if (services.length === 0) {
    return showError(
      "Este barbero no tiene servicios activos en este momento.",
    );
  }

  if (slots.length === 0) {
    return showError(
      `No hay espacios disponibles para el ${formatLongDate(fecha)}. Vuelve mañana o elige otra fecha desde la agenda.`,
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Nueva cita</h1>
      <div className="rounded-xl border border-line bg-white/60 p-5">
        <CreateAppointmentForm services={services} slots={slots} />
      </div>
      <p className="text-xs text-ink-soft">
        Si el cliente está aquí ya, puedes agendarlo manualmente. La validación
        de espacios libres y modificaciones se hace en la base de datos.
      </p>
    </div>
  );
}
