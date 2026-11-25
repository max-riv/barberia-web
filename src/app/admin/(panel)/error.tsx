"use client";

import Link from "next/link";

import {
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_SECONDARY_BUTTON_CLASS,
} from "@/components/admin/admin-shared";

/** Error inesperado al renderizar el panel: mensaje en español y salida clara. */
export default function AdminPanelError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="urban-card max-w-2xl p-5 sm:p-6">
      <p className="eyebrow">No pudimos cargar el panel</p>
      <h1 className="mt-4 text-4xl leading-none uppercase">Algo salió mal</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        No es tu culpa. Inténtalo de nuevo en un momento o vuelve a la agenda.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className={`${ADMIN_PRIMARY_BUTTON_CLASS} sm:max-w-48`}
        >
          Intentar de nuevo
        </button>
        <Link
          href="/admin"
          className={`${ADMIN_SECONDARY_BUTTON_CLASS} sm:max-w-48`}
        >
          Volver a la agenda
        </Link>
      </div>
    </div>
  );
}
