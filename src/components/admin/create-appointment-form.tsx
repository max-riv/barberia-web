"use client";

import { useActionState } from "react";

import { createAdminAppointmentAction } from "@/actions/admin-appointments";
import type { AdminErrorField, AdminCreateState } from "@/lib/admin-state";
import { initialAdminCreateState } from "@/lib/admin-state";
import type { AdminService } from "@/lib/admin-data";
import type { BookingSlot } from "@/lib/booking";
import { formatPrice, formatSlotRange } from "@/lib/booking";
import {
  ADMIN_ERROR_BOX_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from "@/components/admin/admin-shared";

type FieldError = (state: AdminCreateState, field: AdminErrorField) => boolean;

/**
 * Formulario de cita manual ("walk-in"). Los campos exactos que espera la
 * acción son `servicio`, `inicio`, `nombre` y `telefono`; las validaciones de
 * antelación, límite de 3 y alineación están en la RPC.
 */
export function CreateAppointmentForm({
  services,
  slots,
}: {
  services: AdminService[];
  slots: BookingSlot[];
}) {
  const [state, formAction, pending] = useActionState(
    createAdminAppointmentAction,
    initialAdminCreateState,
  );

  const error = state.status === "error" ? state : null;

  const fieldError: FieldError = (errorState, field) =>
    errorState.status === "error" && errorState.field === field;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {error && !error.field ? (
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          {error.message}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="servicio"
          className="block text-sm font-semibold text-ink"
        >
          Servicio
        </label>
        <select
          id="servicio"
          name="servicio"
          required
          disabled={pending}
          aria-invalid={fieldError(state, "service") || undefined}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        >
          <option value="">Elige un servicio…</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} · {formatPrice(service.priceCents)}
            </option>
          ))}
        </select>
        {error && error.field === "service" ? (
          <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
            {error.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="inicio"
          className="block text-sm font-semibold text-ink"
        >
          Horario
        </label>
        <select
          id="inicio"
          name="inicio"
          required
          disabled={pending}
          aria-invalid={fieldError(state, "slot") || undefined}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        >
          <option value="">Elige un espacio…</option>
          {slots.map((slot) => (
            <option key={slot.start} value={slot.start}>
              {formatSlotRange(slot)}
            </option>
          ))}
        </select>
        {error && error.field === "slot" ? (
          <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
            {error.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="nombre"
          className="block text-sm font-semibold text-ink"
        >
          Nombre del cliente
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder="Nombre completo"
          aria-invalid={fieldError(state, "name") || undefined}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        />
        {error && error.field === "name" ? (
          <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
            {error.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="telefono"
          className="block text-sm font-semibold text-ink"
        >
          Teléfono
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="8767 7997"
          aria-invalid={fieldError(state, "phone") || undefined}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        />
        {error && error.field === "phone" ? (
          <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
            {error.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className={ADMIN_PRIMARY_BUTTON_CLASS}
      >
        {pending ? "Reservando…" : "Reservar cita"}
      </button>

      <p className="text-xs leading-relaxed text-ink-soft">
        La cita se crea con el servicio elegido, para el espacio indicado.
      </p>
    </form>
  );
}
