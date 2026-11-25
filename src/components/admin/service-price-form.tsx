"use client";

import { useActionState } from "react";

import { updateServicePriceAction } from "@/actions/admin-settings";
import {
  ADMIN_ERROR_BOX_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SUCCESS_BOX_CLASS,
} from "@/components/admin/admin-shared";
import { initialAdminServicePriceState } from "@/lib/admin-state";

/** Tope de la base de datos, en colones: ₡100.000. */
const MAX_PRICE_COLONES = 100000;

/**
 * Cambia el precio de un servicio. El identificador viaja en un campo
 * oculto y la base de datos vuelve a validar el servicio y el rango.
 */
export function ServicePriceForm({
  serviceId,
  priceCents,
}: {
  serviceId: string;
  priceCents: number;
}) {
  const [state, formAction, pending] = useActionState(
    updateServicePriceAction,
    initialAdminServicePriceState,
  );

  const error = state.status === "error" ? state : null;
  const priceId = `precio-${serviceId}`;

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="servicio" value={serviceId} />

      {state.status === "updated" ? (
        <p role="status" className={ADMIN_SUCCESS_BOX_CLASS}>
          Precio actualizado.
        </p>
      ) : null}

      {error && error.field !== "price" ? (
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          {error.message}
        </p>
      ) : null}

      <div>
        <label
          htmlFor={priceId}
          className="block text-sm font-semibold text-ink"
        >
          Precio (₡)
        </label>
        <input
          id={priceId}
          name="precio"
          type="number"
          min={0}
          max={MAX_PRICE_COLONES}
          step={1}
          required
          inputMode="numeric"
          disabled={pending}
          aria-invalid={error?.field === "price" || undefined}
          defaultValue={Math.round(priceCents / 100)}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        />
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
          Colones enteros: 6000 = ₡6.000.
        </p>
        {error?.field === "price" ? (
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
        {pending ? "Guardando…" : "Guardar precio"}
      </button>
    </form>
  );
}
