import type { Metadata } from "next";
import Link from "next/link";

import { BookingForm } from "@/components/booking/booking-form";
import { DateStrip } from "@/components/booking/date-strip";
import { SlotPicker } from "@/components/booking/slot-picker";
import { SiteHeader } from "@/components/site-header";
import {
  buildDateOptions,
  formatLongDate,
  formatPrice,
  formatSlotRange,
  slotFromStart,
  todayInBusinessTimezone,
} from "@/lib/booking";
import { BUSINESS_FALLBACK } from "@/lib/business";
import { loadAvailableSlots, loadBusinessContext } from "@/lib/booking-data";

export const metadata: Metadata = {
  title: "Reservar cita",
  description:
    "Elige día y hora para tu corte en Charlie's Barbershop. Sin crear cuenta.",
};

type SearchParams = Promise<{
  fecha?: string | string[];
  hora?: string | string[];
}>;

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const context = await loadBusinessContext();

  if (!context) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader businessName={BUSINESS_FALLBACK.name} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
          <h1 className="text-2xl font-semibold tracking-tight">
            La reserva no está disponible
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            Estamos configurando la agenda. Vuelve en unos minutos o escríbenos
            por WhatsApp.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep"
          >
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  const today = todayInBusinessTimezone();
  const options = buildDateOptions({
    today,
    openWeekdays: context.openWeekdays,
  });

  const requestedDate = single(params.fecha);
  const requestedIsValid =
    Boolean(requestedDate) &&
    options.some((option) => option.date === requestedDate);

  let selectedDate: string;
  let slots: Awaited<ReturnType<typeof loadAvailableSlots>>;

  if (requestedIsValid) {
    selectedDate = requestedDate as string;
    slots = await loadAvailableSlots(selectedDate);
  } else {
    // Sin fecha en la URL: abre el primer día que todavía tenga espacios.
    const candidates = options.slice(0, 5);
    const results = await Promise.all(
      candidates.map((option) => loadAvailableSlots(option.date)),
    );
    const firstWithSlots = results.findIndex(
      (result) => (result?.length ?? 0) > 0,
    );
    const index = firstWithSlots >= 0 ? firstWithSlots : 0;

    selectedDate = candidates[index]?.date ?? today;
    slots = results[index] ?? null;
  }

  const requestedSlot = slotFromStart(single(params.hora));
  const isAvailable =
    requestedSlot !== null &&
    slots !== null &&
    slots.some(
      (slot) =>
        new Date(slot.start).getTime() ===
        new Date(requestedSlot.start).getTime(),
    );
  const slotWasTaken = requestedSlot !== null && slots !== null && !isAvailable;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader businessName={context.business.name} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16">
        <section className="pt-8 pb-7">
          <p className="text-xs font-semibold tracking-[0.18em] text-copper uppercase">
            Reserva en línea
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            Elige día y hora
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            {context.service.name} · {context.service.durationMinutes} min ·{" "}
            {formatPrice(context.service.priceCents, context.business.currency)}
            . Sin crear cuenta: solo tu nombre y tu teléfono.
          </p>
        </section>

        <section aria-labelledby="paso-fecha" className="pb-7">
          <h2 id="paso-fecha" className="mb-3 text-sm font-semibold">
            1. Elige el día
          </h2>
          <DateStrip options={options} selected={selectedDate} />
        </section>

        <section aria-labelledby="paso-hora" className="pb-7">
          <h2
            id="paso-hora"
            className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm font-semibold"
          >
            <span>2. Elige la hora</span>
            <span className="text-xs font-normal text-ink-soft capitalize">
              {formatLongDate(selectedDate)}
            </span>
          </h2>

          {slots === null ? (
            <p className="rounded-xl border border-dashed border-line bg-white/40 px-4 py-6 text-center text-sm text-ink-soft">
              No pudimos cargar los horarios. Recarga la página en un momento.
            </p>
          ) : (
            <SlotPicker
              date={selectedDate}
              slots={slots}
              selectedStart={
                isAvailable && requestedSlot ? requestedSlot.start : null
              }
            />
          )}
        </section>

        <section
          id="datos"
          aria-labelledby="paso-datos"
          className="scroll-mt-6 rounded-2xl border border-line bg-white/60 p-5"
        >
          <h2 id="paso-datos" className="text-sm font-semibold">
            3. Tus datos
          </h2>

          {requestedSlot ? (
            <>
              <p className="mt-1 text-sm text-ink-soft">
                <span className="capitalize">
                  {formatLongDate(selectedDate)}
                </span>{" "}
                · {formatSlotRange(requestedSlot)}
              </p>
              <div className="mt-4">
                {/*
                  Se monta siempre que haya una hora en la URL, incluso si el
                  espacio se acaba de ocupar: así el estado de éxito de la
                  Server Action no se pierde al re-renderizar la página.
                */}
                <BookingForm slot={requestedSlot} taken={slotWasTaken} />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              Elige una hora disponible para dejar tus datos.
            </p>
          )}
        </section>

        <p className="mt-6 text-xs leading-relaxed text-ink-soft">
          Zona horaria de Costa Rica. Si no ves tu hora preferida, puede estar
          ocupada o fuera del horario de atención.
        </p>
      </main>
    </div>
  );
}
