"use client";

import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { BUSINESS_FALLBACK } from "@/lib/business";

export default function ReservarError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader businessName={BUSINESS_FALLBACK.name} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <p className="eyebrow">Reserva en línea</p>
        <h1 className="mt-4 text-5xl leading-[0.92] uppercase">
          No pudimos cargar los horarios
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
          Inténtalo de nuevo en un momento. Tu cita no se ha reservado todavía.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-14 items-center justify-center rounded-lg bg-copper px-6 text-sm font-bold text-sand active:bg-copper-dark"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line bg-surface px-6 text-sm font-semibold text-ink active:bg-panel"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
