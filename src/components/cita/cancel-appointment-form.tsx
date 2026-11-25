"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { cancelAppointmentAction } from "@/actions/cancel-appointment";
import { initialCancelState } from "@/lib/appointment-state";

const BUTTON_BASE =
  "inline-flex min-h-12 w-full items-center justify-center rounded-lg px-5 text-center text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

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
        className="rounded-lg border border-emerald-400/40 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-100"
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
          className="mb-3 rounded-lg border border-red-400/50 bg-red-950/60 px-4 py-3 text-sm text-red-100"
        >
          {state.message}
        </p>
      ) : null}

      {confirming ? (
        <div className="rounded-xl border border-red-400/35 bg-surface p-4">
          <p className="text-sm font-medium text-ink">
            ¿Seguro? La cita se libera para otra persona.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              ref={confirmButtonRef}
              type="submit"
              disabled={pending}
              className={`${BUTTON_BASE} bg-barber-red text-white active:bg-red-800 sm:flex-1`}
            >
              {pending ? "Cancelando…" : "Sí, cancelar"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className={`${BUTTON_BASE} border border-line bg-panel text-ink active:border-copper sm:flex-1`}
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
          className={`${BUTTON_BASE} border border-red-400/50 bg-red-950/35 text-red-100 active:bg-red-950/70`}
        >
          Cancelar cita
        </button>
      )}
    </form>
  );
}
