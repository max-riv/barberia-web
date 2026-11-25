import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateAppointmentForm } from "@/components/admin/create-appointment-form";
import { DateStrip } from "@/components/booking/date-strip";
import {
  loadAdminOpenWeekdays,
  loadAdminServices,
  loadAdminSlots,
} from "@/lib/admin-data";
import {
  buildDateOptions,
  formatLongDate,
  todayInBusinessTimezone,
} from "@/lib/booking";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const BACK_LINK_CLASS =
  "inline-flex min-h-12 items-center rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors active:bg-panel";

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

  const showError = (message: string) => (
    <div className="space-y-4">
      <h1 className="text-4xl leading-none uppercase">Nueva cita</h1>
      <p
        role="alert"
        className="rounded-lg border border-red-400/50 bg-red-950/60 px-4 py-3 text-sm text-red-100"
      >
        {message}
      </p>
      <Link href="/admin" className={BACK_LINK_CLASS}>
        Volver a la agenda
      </Link>
    </div>
  );

  const [openWeekdays, services] = await Promise.all([
    loadAdminOpenWeekdays(access.barber.id),
    loadAdminServices(access.barber.businessId),
  ]);

  if (openWeekdays === null || services === null) {
    return showError(
      "No pudimos cargar los datos del formulario. Inténtalo de nuevo en un momento.",
    );
  }

  if (services.length === 0) {
    return showError(
      "Este barbero no tiene servicios activos en este momento.",
    );
  }

  const today = todayInBusinessTimezone();
  const options = buildDateOptions({ today, openWeekdays });

  if (options.length === 0) {
    return showError(
      "Este barbero no tiene días de atención configurados en este momento.",
    );
  }

  const requested = Array.isArray(params.fecha)
    ? params.fecha[0]
    : params.fecha;
  const selectedDate =
    typeof requested === "string" &&
    options.some((option) => option.date === requested)
      ? requested
      : (options[0]?.date ?? today);

  const datePicker = (
    <section aria-labelledby="dia-cita" className="space-y-3">
      <h2 id="dia-cita" className="text-sm font-semibold">
        1. Elige el día
      </h2>
      <DateStrip
        options={options}
        selected={selectedDate}
        baseHref="/admin/nueva"
      />
    </section>
  );

  const slots = await loadAdminSlots(selectedDate);

  if (slots === null) {
    return showError(
      "No pudimos cargar los horarios del día elegido. Inténtalo de nuevo en un momento.",
    );
  }

  if (slots.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-4xl leading-none uppercase">Nueva cita</h1>
        {datePicker}
        <p
          role="alert"
          className="rounded-xl border border-line bg-surface/60 px-3 py-2.5 text-sm text-ink-soft"
        >
          No hay espacios disponibles para el {formatLongDate(selectedDate)}.
          Elige otro día.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-4xl leading-none uppercase">Nueva cita</h1>

      {datePicker}

      <section aria-labelledby="datos-cita" className="urban-card p-4 sm:p-5">
        <h2
          id="datos-cita"
          className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm font-semibold"
        >
          <span>2. Datos de la cita</span>
          <span className="text-xs font-normal text-ink-soft capitalize">
            {formatLongDate(selectedDate)}
          </span>
        </h2>
        <CreateAppointmentForm services={services} slots={slots} />
      </section>

      <p className="text-xs leading-relaxed text-ink-soft">
        Puedes agendar en cualquier día hábil dentro de los próximos 30 días. La
        validación de espacios libres y modificaciones se hace en la base de
        datos.
      </p>
    </div>
  );
}
