import Link from "next/link";

import { ADMIN_ERROR_BOX_CLASS } from "@/components/admin/admin-shared";
import { StatusBadge } from "@/components/cita/status-badge";
import { loadAdminAgenda } from "@/lib/admin-data";
import { addDays, todayInBusinessTimezone } from "@/lib/booking";
import {
  adminAppointmentHref,
  formatAdminAppointmentTime,
  groupAppointmentsByDay,
  isAppointmentPast,
  summarizeAgenda,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

const NEW_APPOINTMENT_LINK =
  "inline-flex min-h-12 items-center justify-center rounded-lg bg-copper px-5 text-sm font-bold text-sand transition-colors active:bg-copper-dark";

export default async function AdminAgendaPage() {
  const today = todayInBusinessTimezone();
  const appointments = await loadAdminAgenda(today, addDays(today, 6));

  if (appointments === null) {
    return (
      <div className="space-y-4">
        <p className="eyebrow">Panel</p>
        <h1 className="text-4xl uppercase">Agenda</h1>
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          No pudimos cargar la agenda ahora mismo. Inténtalo de nuevo en un
          momento.
        </p>
      </div>
    );
  }

  const summary = summarizeAgenda(appointments);
  const groups = groupAppointmentsByDay(appointments);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Tu semana</p>
          <h1 className="mt-3 text-5xl leading-none uppercase">Agenda</h1>
        </div>
        <Link href="/admin/nueva" className={NEW_APPOINTMENT_LINK}>
          + Nueva cita
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="urban-card p-4 sm:p-5">
          <dt className="text-xs font-bold tracking-[0.12em] text-ink-soft uppercase">
            Citas de hoy
          </dt>
          <dd className="mt-2 font-display text-4xl leading-none font-bold text-copper">
            {summary.today}
          </dd>
        </div>
        <div className="urban-card p-4 sm:p-5">
          <dt className="text-xs font-bold tracking-[0.12em] text-ink-soft uppercase">
            Próximos 7 días
          </dt>
          <dd className="mt-2 font-display text-4xl leading-none font-bold text-ink">
            {summary.week}
          </dd>
        </div>
      </dl>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface/70 px-5 py-10 text-center">
          <h2 className="text-3xl uppercase">Tu agenda está libre</h2>
          <p className="mt-2 text-sm text-ink-soft">Aún no hay citas.</p>
          <Link
            href="/admin/nueva"
            className={`${NEW_APPOINTMENT_LINK} mt-5 w-full sm:w-auto`}
          >
            Agendar cita
          </Link>
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.date} className="space-y-3">
              <h2 className="flex flex-wrap items-baseline gap-2 text-2xl text-ink uppercase">
                {group.label}
                {group.isToday ? (
                  <span className="font-sans text-xs font-bold tracking-[0.12em] text-copper uppercase">
                    Hoy
                  </span>
                ) : null}
              </h2>
              <ul className="space-y-2.5">
                {group.appointments.map((appointment) => (
                  <li key={appointment.id}>
                    <Link
                      href={adminAppointmentHref(appointment.id)}
                      className="flex min-h-[76px] items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors active:border-copper active:bg-panel"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {appointment.customerName}
                        </span>
                        <span className="mt-1 block text-sm font-medium text-copper tabular-nums">
                          {formatAdminAppointmentTime(appointment)}
                        </span>
                      </span>
                      <StatusBadge
                        status={appointment.status}
                        isPast={isAppointmentPast(appointment)}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
