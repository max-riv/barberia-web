"use client";

import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { BUSINESS_FALLBACK } from "@/lib/business";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const PRIMARY_BUTTON =
  "inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-copper px-6 text-center text-sm font-bold text-sand transition-colors active:bg-copper-dark";
const SECONDARY_LINK =
  "inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-line bg-surface px-6 text-center text-sm font-semibold text-ink transition-colors active:border-copper active:bg-panel";

/** Error inesperado al renderizar la cita: mensaje en español y salida clara. */
export default function CitaError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const whatsapp = buildWhatsAppLink({
    phone: BUSINESS_FALLBACK.whatsappPhone,
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader businessName={BUSINESS_FALLBACK.name} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16">
        <section className="pt-10 pb-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-copper uppercase">
            Algo salió mal
          </p>
          <h1 className="mt-4 text-5xl leading-[0.92] text-balance uppercase sm:text-6xl">
            No pudimos abrir tu cita
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            No es tu culpa. Inténtalo de nuevo en un momento o escríbenos por
            WhatsApp si necesitas cambiar o cancelar la cita.
          </p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className={PRIMARY_BUTTON}
          >
            Intentar de nuevo
          </button>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={SECONDARY_LINK}
          >
            Escríbenos por WhatsApp
          </a>
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded text-sm font-semibold text-ink underline decoration-line underline-offset-4"
        >
          Volver al inicio
        </Link>
      </main>
    </div>
  );
}
