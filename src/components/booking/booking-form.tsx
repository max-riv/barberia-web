"use client";

import Link from "next/link";
import { useActionState } from "react";

import { bookAppointmentAction } from "@/actions/book-appointment";
import type { BookingSlot } from "@/lib/booking";
import { initialBookingState } from "@/lib/booking-state";

const INPUT_CLASS =
  "min-h-12 w-full rounded-lg border border-line bg-panel px-3.5 py-3 text-base text-ink transition-colors placeholder:text-[#8f8f8f] focus:border-copper focus:outline-none";

function errorClass(hasError: boolean): string {
  return hasError ? "border-red-400 bg-red-950/50" : "";
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
          className="rounded-lg border border-amber-400/50 bg-amber-950/60 px-4 py-3 text-sm leading-relaxed text-amber-100"
        >
          Ese espacio se acaba de ocupar. Elige otro horario.
        </p>
        <Link
          href="/reservar"
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line bg-panel px-5 text-sm font-bold text-ink transition-colors active:border-copper"
        >
          Ver otros horarios
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
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
          className={`${INPUT_CLASS} mt-2 ${errorClass(error?.field === "name")}`}
        />
      </div>

      <div>
        <label
          htmlFor="telefono"
          className="block text-sm font-semibold text-ink"
        >
          Teléfono
        </label>
        <div className="mt-2 flex min-h-12 items-stretch overflow-hidden rounded-lg border border-line bg-panel focus-within:border-copper">
          <span className="flex items-center border-r border-line bg-sand-deep px-3 text-sm font-bold text-ink">
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
            className={`min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-ink placeholder:text-[#8f8f8f] focus:outline-none ${error?.field === "phone" ? "bg-red-950/50" : ""}`}
          />
        </div>
        <p id="telefono-ayuda" className="mt-2 text-xs text-ink-soft">
          8 dígitos. Puedes escribirlo con o sin el +506.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-400/50 bg-red-950/60 px-4 py-3 text-sm leading-relaxed text-red-100"
        >
          {error.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-copper px-6 text-base font-bold text-sand transition-colors active:bg-copper-dark disabled:cursor-not-allowed disabled:opacity-60"
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
