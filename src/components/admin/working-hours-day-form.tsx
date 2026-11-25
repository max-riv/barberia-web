"use client";

import { useActionState } from "react";

import { setWorkingHoursAction } from "@/actions/admin-schedule";
import {
  ADMIN_ERROR_BOX_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SUCCESS_BOX_CLASS,
} from "@/components/admin/admin-shared";
import { HALF_HOUR_OPTIONS } from "@/components/admin/time-options";
import { initialAdminWorkingHoursState } from "@/lib/admin-state";
import type { WorkingHoursRange } from "@/lib/schedule";

/** Filas fijas del editor: un día admite hasta 4 tramos. */
const MAX_ROWS = 4;

/** "Miércoles" → "miércoles", para usar el día dentro de una frase. */
function lowerFirst(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/**
 * Editor de los tramos de un día de la semana. Las 4 filas mandan pares
 * repetidos `inicio`/`fin`; la acción ignora los pares vacíos, así que
 * dejar todas las filas en "—" cierra el día.
 */
export function WorkingHoursDayForm({
  weekday,
  weekdayLabel,
  ranges,
}: {
  weekday: number;
  weekdayLabel: string;
  ranges: readonly WorkingHoursRange[];
}) {
  const [state, formAction, pending] = useActionState(
    setWorkingHoursAction,
    initialAdminWorkingHoursState,
  );

  const error = state.status === "error" ? state : null;
  const rangesInvalid = error?.field === "ranges";
  const idBase = `horario-${weekday}`;

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="dia" value={weekday} />

      {state.status === "updated" ? (
        <p role="status" className={ADMIN_SUCCESS_BOX_CLASS}>
          Horario del {lowerFirst(weekdayLabel)} guardado.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          {error.message}
        </p>
      ) : null}

      {Array.from({ length: MAX_ROWS }, (_, row) => {
        const range = ranges[row];
        const startId = `${idBase}-inicio-${row}`;
        const endId = `${idBase}-fin-${row}`;

        return (
          <div key={row} className="flex gap-2">
            <div className="min-w-0 flex-1">
              <label
                htmlFor={startId}
                className="block text-xs font-semibold text-ink-soft"
              >
                Inicio
              </label>
              <select
                id={startId}
                name="inicio"
                disabled={pending}
                aria-invalid={rangesInvalid || undefined}
                defaultValue={range?.start ?? ""}
                className={`mt-1 ${ADMIN_INPUT_CLASS}`}
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
                htmlFor={endId}
                className="block text-xs font-semibold text-ink-soft"
              >
                Fin
              </label>
              <select
                id={endId}
                name="fin"
                disabled={pending}
                aria-invalid={rangesInvalid || undefined}
                defaultValue={range?.end ?? ""}
                className={`mt-1 ${ADMIN_INPUT_CLASS}`}
              >
                <option value="">—</option>
                {HALF_HOUR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}

      <button
        type="submit"
        disabled={pending}
        className={ADMIN_PRIMARY_BUTTON_CLASS}
      >
        {pending ? "Guardando…" : "Guardar día"}
      </button>

      <p className="text-xs leading-relaxed text-ink-soft">
        Deja todos los tramos vacíos para cerrar el día.
      </p>
    </form>
  );
}
