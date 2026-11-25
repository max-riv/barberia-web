"use client";

import { useActionState } from "react";

import { createTimeOffAction } from "@/actions/admin-schedule";
import {
  ADMIN_ERROR_BOX_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SUCCESS_BOX_CLASS,
  ADMIN_WARNING_BOX_CLASS,
} from "@/components/admin/admin-shared";
import { HALF_HOUR_OPTIONS } from "@/components/admin/time-options";
import { initialAdminTimeOffState } from "@/lib/admin-state";
import { formatPhoneForDisplay, formatSlotTime } from "@/lib/booking";

/**
 * Formulario de nuevo bloqueo. Si hay citas confirmadas dentro del rango, la
 * acción devuelve `"conflict"`: se listan las citas, se manda `forzar=1` en un
 * campo oculto y el botón pasa a "Crear bloqueo de todos modos".
 */
export function TimeOffForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(
    createTimeOffAction,
    initialAdminTimeOffState,
  );

  const isConflict = state.status === "conflict";
  const error = state.status === "error" ? state : null;
  const timeOffInvalid = error?.field === "timeOff";

  // En "conflict" la acción repite lo que el usuario escribió, para que el
  // reenvío con `forzar=1` use exactamente esos valores.
  const echo = isConflict ? state : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {isConflict ? <input type="hidden" name="forzar" value="1" /> : null}

      {state.status === "created" ? (
        <p role="status" className={ADMIN_SUCCESS_BOX_CLASS}>
          Bloqueo creado.
          {state.forced && state.conflicts.length > 0
            ? " Recuerda revisar las citas del rango."
            : ""}
        </p>
      ) : null}

      {isConflict ? (
        <div role="alert" className={ADMIN_WARNING_BOX_CLASS}>
          <p className="font-semibold">
            Estas citas confirmadas caen dentro del bloqueo:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {state.conflicts.map((conflict) => (
              <li key={conflict.startsAt}>
                {conflict.customerName}, {formatSlotTime(conflict.startsAt)} a{" "}
                {formatSlotTime(conflict.endsAt)},{" "}
                {formatPhoneForDisplay(conflict.customerPhone)}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Se creará el bloqueo igual y las citas quedan en tu agenda para que
            las gestione.
          </p>
        </div>
      ) : null}

      {error && !error.field ? (
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          {error.message}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="bloqueo-fecha"
          className="block text-sm font-semibold text-ink"
        >
          Fecha
        </label>
        <input
          id="bloqueo-fecha"
          name="fecha"
          type="date"
          required
          min={today}
          disabled={pending}
          aria-invalid={timeOffInvalid || undefined}
          defaultValue={echo?.fecha}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        />
      </div>

      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="bloqueo-inicio"
            className="block text-sm font-semibold text-ink"
          >
            Inicio
          </label>
          <select
            id="bloqueo-inicio"
            name="inicio"
            required
            disabled={pending}
            aria-invalid={timeOffInvalid || undefined}
            defaultValue={echo?.inicio}
            className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
          >
            <option value="">—</option>
            {HALF_HOUR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="bloqueo-fin"
            className="block text-sm font-semibold text-ink"
          >
            Fin
          </label>
          <select
            id="bloqueo-fin"
            name="fin"
            required
            disabled={pending}
            aria-invalid={timeOffInvalid || undefined}
            defaultValue={echo?.fin}
            className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
          >
            <option value="">—</option>
            {HALF_HOUR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value="24:00">Fin del día</option>
          </select>
        </div>
      </div>

      {error?.field === "timeOff" ? (
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          {error.message}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-ink-soft">
        Un bloqueo oculta esos espacios; las citas que ya existan siguen en tu
        agenda.
      </p>

      <div>
        <label
          htmlFor="bloqueo-motivo"
          className="block text-sm font-semibold text-ink"
        >
          Motivo (opcional)
        </label>
        <input
          id="bloqueo-motivo"
          name="motivo"
          type="text"
          maxLength={120}
          disabled={pending}
          aria-invalid={error?.field === "reason" || undefined}
          defaultValue={echo?.motivo}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        />
        {error?.field === "reason" ? (
          <p role="alert" className={`mt-1.5 ${ADMIN_ERROR_BOX_CLASS}`}>
            {error.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className={ADMIN_PRIMARY_BUTTON_CLASS}
      >
        {pending
          ? "Creando…"
          : isConflict
            ? "Crear bloqueo de todos modos"
            : "Crear bloqueo"}
      </button>
    </form>
  );
}
