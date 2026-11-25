"use client";

import { useActionState } from "react";

import { deleteTimeOffAction } from "@/actions/admin-schedule";
import {
  ADMIN_ERROR_BOX_CLASS,
  ADMIN_SUCCESS_BOX_CLASS,
  ADMIN_WARNING_BOX_CLASS,
} from "@/components/admin/admin-shared";
import { initialAdminTimeOffDeleteState } from "@/lib/admin-state";
import { formatTimeOffRange, type AdminTimeOff } from "@/lib/schedule";

const REMOVE_BUTTON_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

/** "jueves 26 de noviembre…" → "Jueves 26 de noviembre…". */
function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function citasEnRango(count: number): string {
  return count === 1
    ? "Hay 1 cita confirmada en el rango."
    : `Hay ${count} citas confirmadas en el rango.`;
}

/** Fila de un bloqueo vigente, con su botón de quitar. */
function TimeOffRow({ timeOff }: { timeOff: AdminTimeOff }) {
  const [state, formAction, pending] = useActionState(
    deleteTimeOffAction,
    initialAdminTimeOffDeleteState,
  );

  const isDeleted = state.status === "deleted";

  return (
    <li className="rounded-2xl border border-line bg-white/70 p-4 sm:p-5">
      <p className="text-sm font-semibold text-ink">
        {upperFirst(formatTimeOffRange(timeOff))}
      </p>
      {timeOff.reason ? (
        <p className="mt-1 text-sm text-ink-soft">{timeOff.reason}</p>
      ) : null}
      {timeOff.appointmentCount > 0 ? (
        <p className={`mt-2 ${ADMIN_WARNING_BOX_CLASS}`}>
          {citasEnRango(timeOff.appointmentCount)}
        </p>
      ) : null}

      {state.status === "error" ? (
        <p role="alert" className={`mt-2 ${ADMIN_ERROR_BOX_CLASS}`}>
          {state.message}
        </p>
      ) : null}

      {isDeleted ? (
        <p role="status" className={`mt-2 ${ADMIN_SUCCESS_BOX_CLASS}`}>
          Bloqueo quitado.
        </p>
      ) : null}

      <form action={formAction} className="mt-3">
        <input type="hidden" name="id" value={timeOff.id} />
        <button
          type="submit"
          disabled={pending || isDeleted}
          className={REMOVE_BUTTON_CLASS}
        >
          {pending ? "Quitando…" : "Quitar"}
        </button>
      </form>
    </li>
  );
}

/** Bloqueos vigentes del barbero, o el aviso de que no hay ninguno. */
export function TimeOffList({
  timeOffs,
}: {
  timeOffs: readonly AdminTimeOff[];
}) {
  if (timeOffs.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-white/60 px-4 py-3 text-sm text-ink-soft">
        No tienes bloqueos próximos.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {timeOffs.map((timeOff) => (
        <TimeOffRow key={timeOff.id} timeOff={timeOff} />
      ))}
    </ul>
  );
}
