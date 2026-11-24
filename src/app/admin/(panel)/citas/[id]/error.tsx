"use client";

import Link from "next/link";

/** Error inesperado al renderizar el detalle de cita: mensaje en español. */
export default function CitasDetalleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="text-sm leading-relaxed text-ink-soft">
        No pudimos abrir el detalle de la cita. Inténtalo de nuevo o vuelve a la
        agenda.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-ink px-6 text-sm font-semibold text-sand transition-colors hover:bg-ink-soft sm:max-w-48"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/admin"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line px-6 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep sm:max-w-48"
        >
          Volver a la agenda
        </Link>
      </div>
    </div>
  );
}
