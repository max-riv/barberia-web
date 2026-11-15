import Link from "next/link";

import { bookingHref, type DateOption } from "@/lib/booking";

/**
 * Selector de día. Es una lista de enlaces: funciona sin JavaScript y cada
 * fecha se puede compartir por URL.
 */
export function DateStrip({
  options,
  selected,
}: {
  options: readonly DateOption[];
  selected: string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      <ol className="flex min-w-max gap-2">
        {options.map((option) => {
          const isSelected = option.date === selected;

          return (
            <li key={option.date}>
              <Link
                href={bookingHref(option.date)}
                aria-current={isSelected ? "date" : undefined}
                aria-label={`${option.weekday} ${option.day} de ${option.month}`}
                className={[
                  "flex min-h-16 w-16 flex-col items-center justify-center rounded-xl border text-center transition-colors",
                  isSelected
                    ? "border-ink bg-ink text-sand"
                    : "border-line bg-white/60 text-ink hover:bg-sand-deep",
                ].join(" ")}
              >
                <span className="text-[10px] font-semibold tracking-[0.12em] uppercase opacity-80">
                  {option.weekday}
                </span>
                <span className="text-lg leading-tight font-semibold">
                  {option.day}
                </span>
                <span className="text-[10px] leading-tight opacity-80">
                  {option.isToday ? "hoy" : option.month}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
