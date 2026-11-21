"use client";

import Link from "next/link";
import { useActionState } from "react";

import { bookAppointmentAction } from "@/actions/book-appointment";
import type { BookingSlot } from "@/lib/booking";
import { initialBookingState } from "@/lib/booking-state";

const INPUT_CLASS =
  "w-full rounded-xl border border-line bg-white px-3 py-3 text-base text-ink transition-colors placeholder:text-ink-soft/60 focus:border-ink focus:outline-none";

function errorClass(hasError: boolean): string {
  return hasError ? "border-red-400 bg-red-50/60" : "";
}

export function BookingForm({
  slot,
  taken = false,
}: {
  slot: BookingSlot;
  /** El espacio ya no está libre (lo tomó otra persona o se acaba de reservar). */
  taken?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    bookAppointmentAction,
    initialBookingState,
  );

  const error = state.status === "error" ? state : null;

  if (taken) {
    return (
      <div className="space-y-4">
        <p
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
        >
          Ese espacio se acaba de ocupar. Elige otro horario.
        </p>
        <Link
          href="/reservar"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep"
        >
          Ver otros horarios
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="inicio" value={slot.start} />

      {/* Honeypot: invisible para personas, tentador para bots. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="empresa">Empresa</label>
        <input
          id="empresa"
          name="empresa"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label
          htmlFor="nombre"
          className="block text-sm font-semibold text-ink"
        >
          Tu nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          placeholder="Nombre y apellido"
          aria-invalid={error?.field === "name" || undefined}
          className={`${INPUT_CLASS} mt-1.5 ${errorClass(error?.field === "name")}`}
        />
      </div>

      <div>
        <label
          htmlFor="telefono"
          className="block text-sm font-semibold text-ink"
        >
          Teléfono
        </label>
        <div className="mt-1.5 flex items-stretch overflow-hidden rounded-xl border border-line bg-white focus-within:border-ink">
          <span className="flex items-center border-r border-line bg-sand-deep/60 px-3 text-sm font-semibold text-ink-soft">
            +506
          </span>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="8767 7997"
            aria-invalid={error?.field === "phone" || undefined}
            aria-describedby="telefono-ayuda"
            className="w-full bg-transparent px-3 py-3 text-base text-ink placeholder:text-ink-soft/60 focus:outline-none"
          />
        </div>
        <p id="telefono-ayuda" className="mt-1.5 text-xs text-ink-soft">
          8 dígitos. Puedes escribirlo con o sin el +506.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-800"
        >
          {error.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-ink px-6 text-sm font-semibold text-sand transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Reservando…" : "Confirmar cita"}
      </button>

      <p className="text-xs leading-relaxed text-ink-soft">
        Al confirmar, se abre el enlace de tu cita: guárdalo para confirmarla
        por WhatsApp o cancelarla. Sin crear cuenta.
      </p>
    </form>
  );
}
