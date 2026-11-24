"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { setAppointmentStatusAction } from "@/actions/admin-appointments";
import {
  APPOINTMENT_STATUS_OPTIONS,
  appointmentStatusLabel,
} from "@/lib/admin";
import type { AppointmentStatus } from "@/lib/appointment";
import { initialAdminStatusState } from "@/lib/admin-state";
import { ADMIN_ERROR_BOX_CLASS } from "@/components/admin/admin-shared";

const BUTTON_BASE =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-center text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const SELECT_CLASS =
  "w-full rounded-xl border border-line bg-white px-3 py-3 text-sm font-semibold text-ink focus:border-ink focus:outline-none";

/**
 * Formulario de cambio de estado de una cita. Ir a `cancelled` pide
 * confirmación en dos pasos (patrón de `cancel-appointment-form.tsx`); el
 * cambio real lo decide la base de datos.
 */
export function StatusChangeForm({
  appointmentId,
  initialStatus,
}: {
  appointmentId: string;
  initialStatus: AppointmentStatus;
}) {
  const [state, formAction, pending] = useActionState(
    setAppointmentStatusAction,
    initialAdminStatusState,
  );
  const [selected, setSelected] = useState<AppointmentStatus>(initialStatus);
  const [confirming, setConfirming] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Al abrir la confirmación, el botón visible queda enfocado.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (confirming) {
      confirmButtonRef.current?.focus();
    }
  }, [confirming]);

  if (state.status === "updated") {
    return (
      <p
        role="status"
        className="rounded-xl border border-line bg-sand-deep px-3 py-2.5 text-sm text-ink"
      >
        Estado actualizado: {appointmentStatusLabel(state.appointmentStatus)}.
      </p>
    );
  }

  const isCancelling = selected === "cancelled";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={appointmentId} />

      {state.status === "error" && state.message ? (
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          {state.message}
        </p>
      ) : null}

      <select
        name="estado"
        value={selected}
        onChange={(event) =>
          setSelected(event.target.value as AppointmentStatus)
        }
        disabled={pending}
        aria-label="Estado de la cita"
        className={SELECT_CLASS}
      >
        {APPOINTMENT_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {confirming ? (
        <div className="rounded-xl border border-line bg-white/70 p-4">
          <p className="text-sm font-medium text-ink">
            ¿Seguro? El espacio queda libre para otra persona.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              ref={confirmButtonRef}
              type="submit"
              disabled={pending}
              className={`${BUTTON_BASE} bg-red-700 text-white hover:bg-red-800 sm:flex-1`}
            >
              {pending ? "Cancelando…" : "Sí, marcar como Cancelada"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className={`${BUTTON_BASE} border border-line bg-white text-ink hover:bg-sand-deep sm:flex-1`}
            >
              Mejor no
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(isCancelling)}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep"
        >
          Cambiar estado
        </button>
      )}
    </form>
  );
}
