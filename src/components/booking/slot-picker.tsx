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
    <div>
      <h3 className="text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
        {title}
      </h3>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const isSelected = slot.start === selectedStart;

          return (
            <li key={slot.start}>
              <Link
                href={`${bookingHref(date, slot.start)}#datos`}
                aria-current={isSelected ? "time" : undefined}
                className={[
                  "flex min-h-11 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-colors",
                  isSelected
                    ? "border-ink bg-ink text-sand"
                    : "border-line bg-white/60 text-ink hover:bg-sand-deep",
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
      <p className="rounded-xl border border-dashed border-line bg-white/40 px-4 py-6 text-center text-sm text-ink-soft">
        No quedan espacios libres ese día. Prueba con otra fecha.
      </p>
    );
  }

  const { morning, afternoon } = groupSlots(slots);

  return (
    <div className="space-y-5">
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
      <p className="text-xs text-ink-soft">
        Cada cita dura 30 minutos. Los horarios que no aparecen ya están
        ocupados.
      </p>
    </div>
  );
}
