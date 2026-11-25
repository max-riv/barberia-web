import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ADMIN_CARD_CLASS,
  ADMIN_ERROR_BOX_CLASS,
} from "@/components/admin/admin-shared";
import { TimeOffForm } from "@/components/admin/time-off-form";
import { TimeOffList } from "@/components/admin/time-off-list";
import { WorkingHoursDayForm } from "@/components/admin/working-hours-day-form";
import { todayInBusinessTimezone } from "@/lib/booking";
import { loadAdminTimeOffs, loadAdminWorkingHours } from "@/lib/admin-data";
import { WEEKDAY_LABELS, type WorkingHoursRange } from "@/lib/schedule";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const RETRY_LINK_CLASS =
  "inline-flex min-h-12 items-center rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors active:bg-panel";

/** "08:00 a 12:00 · 13:00 a 18:00", o "Cerrado" si el día no tiene tramos. */
function summarizeDay(ranges: readonly WorkingHoursRange[]): string {
  if (ranges.length === 0) {
    return "Cerrado";
  }

  return ranges.map((range) => `${range.start} a ${range.end}`).join(" · ");
}

export default async function HorariosPage() {
  const access = await getAdminAccess();

  if (access.status !== "ok") {
    redirect("/admin/login");
  }

  const [workingHours, timeOffs] = await Promise.all([
    loadAdminWorkingHours(access.barber.id),
    loadAdminTimeOffs(),
  ]);

  if (workingHours === null || timeOffs === null) {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl leading-none uppercase">Horarios y bloqueos</h1>
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          No pudimos cargar tus horarios y bloqueos ahora mismo. Inténtalo de
          nuevo en un momento.
        </p>
        <Link href="/admin/horarios" className={RETRY_LINK_CLASS}>
          Intentar de nuevo
        </Link>
      </div>
    );
  }

  const today = todayInBusinessTimezone();

  return (
    <div className="space-y-6">
      <h1 className="text-4xl leading-none uppercase">Horarios y bloqueos</h1>

      <section aria-labelledby="horario-semanal" className="space-y-3">
        <h2 id="horario-semanal" className="text-2xl text-ink uppercase">
          Horario semanal
        </h2>
        <p className="text-sm text-ink-soft">
          Define los tramos de atención de cada día. El cambio se refleja en tu
          página de reservas.
        </p>
        <div className="grid gap-3 xl:grid-cols-2 xl:items-start">
          {workingHours.map((day) => (
            <section
              key={day.weekday}
              aria-labelledby={`dia-${day.weekday}`}
              className={ADMIN_CARD_CLASS}
            >
              <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3
                  id={`dia-${day.weekday}`}
                  className="text-base font-semibold text-ink"
                >
                  {WEEKDAY_LABELS[day.weekday]}
                </h3>
                <p
                  className={
                    day.ranges.length === 0
                      ? "text-sm text-ink-soft"
                      : "text-sm text-ink"
                  }
                >
                  {summarizeDay(day.ranges)}
                </p>
              </header>
              <WorkingHoursDayForm
                weekday={day.weekday}
                weekdayLabel={WEEKDAY_LABELS[day.weekday]}
                ranges={day.ranges}
              />
            </section>
          ))}
        </div>
      </section>

      <section aria-labelledby="bloqueos" className="space-y-3">
        <h2 id="bloqueos" className="text-2xl text-ink uppercase">
          Bloqueos
        </h2>
        <p className="text-sm text-ink-soft">
          Oculta espacios de tu agenda para descansos, diligencias o días
          libres.
        </p>
        <section aria-labelledby="nuevo-bloqueo" className={ADMIN_CARD_CLASS}>
          <h3
            id="nuevo-bloqueo"
            className="mb-4 text-sm font-semibold text-ink"
          >
            Nuevo bloqueo
          </h3>
          <TimeOffForm today={today} />
        </section>
        <section aria-labelledby="bloqueos-vigentes" className="space-y-2">
          <h3 id="bloqueos-vigentes" className="text-sm font-semibold text-ink">
            Bloqueos vigentes
          </h3>
          <TimeOffList timeOffs={timeOffs} />
        </section>
      </section>
    </div>
  );
}
