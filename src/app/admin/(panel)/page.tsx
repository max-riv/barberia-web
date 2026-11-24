import Link from "next/link";

import { loadAdminAgenda } from "@/lib/admin-data";
import { addDays, todayInBusinessTimezone } from "@/lib/booking";
import {
  adminAppointmentHref,
  formatAdminAppointmentTime,
  groupAppointmentsByDay,
  isAppointmentPast,
  summarizeAgenda,
} from "@/lib/admin";
import { StatusBadge } from "@/components/cita/status-badge";

export const dynamic = "force-dynamic";

const NEW_APPOINTMENT_LINK =
  "inline-flex min-h-12 items-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep";

export default async function AdminAgendaPage() {
  const today = todayInBusinessTimezone();
  const appointments = await loadAdminAgenda(today, addDays(today, 6));

  if (appointments === null) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          No pudimos cargar la agenda ahora mismo. Inténtalo de nuevo en un
          momento.
        </p>
      </div>
    );
  }

  const summary = summarizeAgenda(appointments);
  const groups = groupAppointmentsByDay(appointments);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>

      <div className="rounded-xl border border-line bg-white/60 p-4 text-sm text-ink-soft">
        Hoy: <strong className="text-ink">{summary.today}</strong> · Próximos 7
        días: <strong className="text-ink">{summary.week}</strong>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-line bg-white/60 p-4">
          <p className="text-sm text-ink-soft">Aún no hay citas.</p>
          <Link href="/admin/nueva" className={NEW_APPOINTMENT_LINK}>
            Agendar cita
          </Link>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.date} className="space-y-2">
            <h2 className="text-lg font-semibold text-ink">
              {group.label}
              {group.isToday ? (
                <span className="ml-2 text-sm font-normal text-copper">
                  (Hoy)
                </span>
              ) : null}
            </h2>
            <ul className="space-y-2">
              {group.appointments.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/60 px-4 py-3"
                >
                  <Link
                    href={adminAppointmentHref(appointment.id)}
                    className="text-sm font-medium text-ink"
                  >
                    {appointment.customerName} ·{" "}
                    {formatAdminAppointmentTime(appointment)}
                  </Link>
                  <StatusBadge
                    status={appointment.status}
                    isPast={isAppointmentPast(appointment)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
