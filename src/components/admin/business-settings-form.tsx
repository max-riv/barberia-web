"use client";

import { useActionState } from "react";

import { updateBusinessSettingsAction } from "@/actions/admin-settings";
import {
  ADMIN_ERROR_BOX_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SUCCESS_BOX_CLASS,
} from "@/components/admin/admin-shared";
import { initialAdminSettingsState } from "@/lib/admin-state";

/**
 * Datos públicos del negocio. `initialWhatsapp` llega formateado para
 * mostrar (`+506 8767 7997`); la acción acepta cualquier variante del
 * número y lo normaliza sola.
 */
export function BusinessSettingsForm({
  initialName,
  initialWhatsapp,
  initialAddress,
}: {
  initialName: string;
  initialWhatsapp: string;
  initialAddress: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateBusinessSettingsAction,
    initialAdminSettingsState,
  );

  const error = state.status === "error" ? state : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "updated" ? (
        <p role="status" className={ADMIN_SUCCESS_BOX_CLASS}>
          Cambios guardados.
        </p>
      ) : null}

      {error && !error.field ? (
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          {error.message}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="nombre-negocio"
          className="block text-sm font-semibold text-ink"
        >
          Nombre del negocio
        </label>
        <input
          id="nombre-negocio"
          name="nombre"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoComplete="organization"
          disabled={pending}
          aria-invalid={error?.field === "name" || undefined}
          defaultValue={initialName}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        />
        {error?.field === "name" ? (
          <p role="alert" className={`mt-1.5 ${ADMIN_ERROR_BOX_CLASS}`}>
            {error.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="whatsapp-negocio"
          className="block text-sm font-semibold text-ink"
        >
          WhatsApp
        </label>
        <input
          id="whatsapp-negocio"
          name="whatsapp"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          disabled={pending}
          aria-invalid={error?.field === "phone" || undefined}
          defaultValue={initialWhatsapp}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        />
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
          Escríbelo con o sin +506; lo normalizamos solos.
        </p>
        {error?.field === "phone" ? (
          <p role="alert" className={`mt-1.5 ${ADMIN_ERROR_BOX_CLASS}`}>
            {error.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="direccion-negocio"
          className="block text-sm font-semibold text-ink"
        >
          Dirección (opcional)
        </label>
        <input
          id="direccion-negocio"
          name="direccion"
          type="text"
          maxLength={200}
          autoComplete="street-address"
          disabled={pending}
          aria-invalid={error?.field === "address" || undefined}
          defaultValue={initialAddress}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        />
        {error?.field === "address" ? (
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
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
