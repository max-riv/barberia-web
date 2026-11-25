"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { DateOption } from "@/lib/booking";

const EDGE_TOLERANCE = 8;

/** Suscripción vacía: solo sirve para detectar cuándo ya hidrató el cliente. */
const noSubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** Construye el enlace de un día sin pasar funciones al Client Component. */
function dateHref(baseHref: string, date: string): string {
  const params = new URLSearchParams({ fecha: date });
  return `${baseHref}?${params.toString()}`;
}

function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

/**
 * Selector de día. Sigue siendo una lista de enlaces (funciona sin JavaScript
 * y cada fecha se puede compartir por URL), pero añade flechas, degradados y
 * ajuste automático para que se note que hay más días a la derecha.
 */
export function DateStrip({
  options,
  selected,
  baseHref = "/reservar",
}: {
  options: readonly DateOption[];
  selected: string;
  /** Ruta base del selector; por defecto, la reserva pública. */
  baseHref?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLLIElement>(null);
  const isFirstRender = useRef(true);

  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isHydrated = useIsHydrated();

  const updateScrollState = useCallback(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;

    setHasOverflow(maxScroll > EDGE_TOLERANCE);
    setCanScrollLeft(scroller.scrollLeft > EDGE_TOLERANCE);
    setCanScrollRight(scroller.scrollLeft < maxScroll - EDGE_TOLERANCE);
  }, []);

  // Deja el día elegido a la vista: al abrir ?fecha= lejana, la tira arranca
  // en la primera tarjeta y el usuario pierde el contexto.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = selectedRef.current;

    if (!scroller || !active) {
      return;
    }

    const target =
      active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2;

    scroller.scrollTo({
      left: Math.max(0, target),
      behavior:
        isFirstRender.current || prefersReducedMotion() ? "auto" : "smooth",
    });

    isFirstRender.current = false;
  }, [selected]);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState]);

  const nudge = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.8,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const showArrows = isHydrated && hasOverflow;

  return (
    <div className="relative -mx-4">
      <div
        ref={scrollerRef}
        className="snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none]"
      >
        <ol className="flex min-w-max gap-2.5">
          {options.map((option) => {
            const isSelected = option.date === selected;

            return (
              <li
                key={option.date}
                ref={isSelected ? selectedRef : undefined}
                className="snap-start"
              >
                <Link
                  href={dateHref(baseHref, option.date)}
                  aria-current={isSelected ? "date" : undefined}
                  aria-label={`${option.weekday} ${option.day} de ${option.month}`}
                  className={[
                    "flex min-h-[76px] w-[68px] flex-col items-center justify-center rounded-xl border text-center transition-colors",
                    isSelected
                      ? "border-copper bg-copper text-sand shadow-[0_0_0_1px_#c98a62]"
                      : "border-line bg-surface text-ink active:border-copper active:bg-panel",
                  ].join(" ")}
                >
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-90">
                    {option.weekday}
                  </span>
                  <span className="mt-0.5 font-display text-2xl leading-none font-bold">
                    {option.day}
                  </span>
                  <span className="mt-1 text-[10px] leading-tight font-medium uppercase opacity-90">
                    {option.isToday ? "hoy" : option.month}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Degradados: avisan de que hay días fuera de la vista. */}
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-sand to-transparent transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-sand to-transparent transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      {showArrows ? (
        <>
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={!canScrollLeft}
            aria-label="Ver días anteriores"
            className="absolute top-1/2 left-0 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-panel/95 text-ink shadow-lg shadow-black/30 transition-opacity active:border-copper disabled:pointer-events-none disabled:opacity-0"
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={!canScrollRight}
            aria-label="Ver días siguientes"
            className="absolute top-1/2 right-0 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-panel/95 text-ink shadow-lg shadow-black/30 transition-opacity active:border-copper disabled:pointer-events-none disabled:opacity-0"
          >
            <Chevron direction="right" />
          </button>
        </>
      ) : null}
    </div>
  );
}
