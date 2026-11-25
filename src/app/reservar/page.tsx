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
import { buildWhatsAppLink } from "@/lib/whatsapp";

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
    const whatsapp = buildWhatsAppLink({
      phone: BUSINESS_FALLBACK.whatsappPhone,
    });

    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader businessName={BUSINESS_FALLBACK.name} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
          <p className="eyebrow">Reserva en línea</p>
          <h1 className="mt-4 text-4xl leading-none uppercase sm:text-5xl">
            La reserva no está disponible
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
            Estamos configurando la agenda. Vuelve en unos minutos o escríbenos
            por WhatsApp.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-copper px-5 text-sm font-bold text-sand transition-colors active:bg-copper-dark"
            >
              Consultar por WhatsApp
            </a>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors active:bg-panel"
            >
              Volver al inicio
            </Link>
          </div>
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        <section className="border-b border-line/70 pt-8 pb-7 sm:pt-12">
          <p className="eyebrow">Reserva en línea</p>
          <h1 className="mt-4 text-5xl leading-[0.92] uppercase sm:text-6xl">
            Elige día y hora
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
            <span className="font-semibold text-ink">
              {context.service.name}
            </span>
            <span aria-hidden="true" className="text-copper">
              ·
            </span>
            <span>{context.service.durationMinutes} min</span>
            <span aria-hidden="true" className="text-copper">
              ·
            </span>
            <span className="font-bold text-copper">
              {formatPrice(
                context.service.priceCents,
                context.business.currency,
              )}
            </span>
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            Sin crear cuenta: solo tu nombre y tu teléfono.
          </p>
        </section>

        <section aria-labelledby="paso-fecha" className="pt-7 pb-7">
          <h2
            id="paso-fecha"
            className="mb-4 flex items-center gap-3 text-2xl uppercase"
          >
            <span className="grid size-8 place-items-center rounded-md bg-copper font-sans text-xs font-extrabold text-sand">
              01
            </span>
            Elige el día
          </h2>
          <DateStrip options={options} selected={selectedDate} />
        </section>

        <section aria-labelledby="paso-hora" className="pb-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <h2
              id="paso-hora"
              className="flex items-center gap-3 text-2xl uppercase"
            >
              <span className="grid size-8 place-items-center rounded-md bg-copper font-sans text-xs font-extrabold text-sand">
                02
              </span>
              Elige la hora
            </h2>
            <p className="text-xs font-medium text-ink-soft capitalize">
              {formatLongDate(selectedDate)}
            </p>
          </div>

          {slots === null ? (
            <div className="rounded-xl border border-red-400/40 bg-red-950/45 px-5 py-6 text-center">
              <p className="font-display text-2xl uppercase">
                No pudimos cargar los horarios
              </p>
              <p className="mt-2 text-sm text-red-100">
                Recarga la página en un momento para volver a intentarlo.
              </p>
            </div>
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
          className="urban-card scroll-mt-6 p-4 sm:p-6"
        >
          <h2
            id="paso-datos"
            className="flex items-center gap-3 text-2xl uppercase"
          >
            <span className="grid size-8 place-items-center rounded-md bg-copper font-sans text-xs font-extrabold text-sand">
              03
            </span>
            Tus datos
          </h2>

          {requestedSlot ? (
            <>
              <div className="mt-4 mb-5 rounded-lg border border-copper/35 bg-copper/10 px-4 py-3">
                <p className="text-xs font-bold tracking-[0.12em] text-copper uppercase">
                  Horario elegido
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  <span className="capitalize">
                    {formatLongDate(selectedDate)}
                  </span>{" "}
                  · {formatSlotRange(requestedSlot)}
                </p>
              </div>
              {/*
                Se monta siempre que haya una hora en la URL, incluso si el
                espacio se acaba de ocupar: así el estado de éxito de la
                Server Action no se pierde al re-renderizar la página.
              */}
              <BookingForm slot={requestedSlot} taken={slotWasTaken} />
            </>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-line bg-panel/50 px-4 py-5 text-sm leading-relaxed text-ink-soft">
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
