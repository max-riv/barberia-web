"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { cancelAppointmentAction } from "@/actions/cancel-appointment";
import { initialCancelState } from "@/lib/appointment-state";

const BUTTON_BASE =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-center text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Cancelación en dos pasos. La primera pulsación pide confirmación; el envío
 * real lo decide la base de datos a través de la Server Action.
 */
export function CancelAppointmentForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    cancelAppointmentAction,
    initialCancelState,
  );
  const [confirming, setConfirming] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Al abrir o cerrar la confirmación, el botón enfocado desaparece: movemos
    // el foco al paso visible para no dejar el teclado sin referencia.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (confirming) {
      confirmButtonRef.current?.focus();
    } else {
      cancelButtonRef.current?.focus();
    }
  }, [confirming]);

  if (state.status === "cancelled") {
    return (
      <p
        role="status"
        className="rounded-xl border border-line bg-sand-deep px-3 py-2.5 text-sm text-ink"
      >
        La cita quedó cancelada.
      </p>
    );
  }

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="token" value={token} />

      {state.status === "error" ? (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {state.message}
        </p>
      ) : null}

      {confirming ? (
        <div className="rounded-xl border border-line bg-white/70 p-4">
          <p className="text-sm font-medium text-ink">
            ¿Seguro? La cita se libera para otra persona.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              ref={confirmButtonRef}
              type="submit"
              disabled={pending}
              className={`${BUTTON_BASE} bg-red-700 text-white hover:bg-red-800 sm:flex-1`}
            >
              {pending ? "Cancelando…" : "Sí, cancelar"}
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
          ref={cancelButtonRef}
          type="button"
          onClick={() => setConfirming(true)}
          className={`${BUTTON_BASE} border border-red-300 bg-white text-red-800 hover:bg-red-50`}
        >
          Cancelar cita
        </button>
      )}
    </form>
  );
}
