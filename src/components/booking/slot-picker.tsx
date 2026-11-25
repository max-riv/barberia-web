import Link from "next/link";

import {
  bookingHref,
  formatSlotTime,
  groupSlots,
  type BookingSlot,
} from "@/lib/booking";

function SlotGroup({
  title,
  date,
  slots,
  selectedStart,
}: {
  title: string;
  date: string;
  slots: readonly BookingSlot[];
  selectedStart: string | null;
}) {
  if (slots.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-line/70 bg-surface/45 p-3 sm:p-4">
      <h3 className="font-sans text-xs font-bold tracking-[0.16em] text-ink-soft uppercase">
        {title}
      </h3>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const isSelected = slot.start === selectedStart;

          return (
            <li key={slot.start}>
              <Link
                href={`${bookingHref(date, slot.start)}#datos`}
                aria-current={isSelected ? "time" : undefined}
                className={[
                  "flex min-h-12 items-center justify-center rounded-lg border text-base font-bold tabular-nums transition-colors",
                  isSelected
                    ? "border-copper bg-copper text-sand shadow-[0_0_0_1px_#c98a62]"
                    : "border-line bg-panel text-ink active:border-copper active:text-copper",
                ].join(" ")}
              >
                {formatSlotTime(slot.start)}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Espacios libres del día elegido, separados en mañana y tarde. */
export function SlotPicker({
  date,
  slots,
  selectedStart,
}: {
  date: string;
  slots: readonly BookingSlot[];
  selectedStart: string | null;
}) {
  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/70 px-5 py-8 text-center">
        <p className="font-display text-2xl font-semibold uppercase">
          Día completo
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          No quedan espacios libres ese día. Prueba con otra fecha.
        </p>
      </div>
    );
  }

  const { morning, afternoon } = groupSlots(slots);

  return (
    <div className="space-y-4">
      <SlotGroup
        title="Mañana"
        date={date}
        slots={morning}
        selectedStart={selectedStart}
      />
      <SlotGroup
        title="Tarde"
        date={date}
        slots={afternoon}
        selectedStart={selectedStart}
      />
      <p className="text-xs leading-relaxed text-ink-soft">
        Cada cita dura 30 minutos. Los horarios que no aparecen ya están
        ocupados.
      </p>
    </div>
  );
}
