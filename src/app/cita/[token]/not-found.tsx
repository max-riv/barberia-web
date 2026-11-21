import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { BUSINESS_FALLBACK } from "@/lib/business";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const PRIMARY_LINK =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-ink px-6 text-center text-sm font-semibold text-sand transition-colors hover:bg-ink-soft";
const SECONDARY_LINK =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line px-6 text-center text-sm font-semibold text-ink transition-colors hover:bg-sand-deep";

/** Token inválido o cita inexistente: mismo 404 amable para los dos casos. */
export default function CitaNotFound() {
  const whatsapp = buildWhatsAppLink({
    phone: BUSINESS_FALLBACK.whatsappPhone,
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader businessName={BUSINESS_FALLBACK.name} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16">
        <section className="pt-10 pb-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-copper uppercase">
            Cita no encontrada
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            No encontramos esta cita
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            El enlace puede estar incompleto o la cita ya no existe. Revisa que
            hayas abierto la dirección completa y vuelve a intentarlo.
          </p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/reservar" className={PRIMARY_LINK}>
            Reservar una cita
          </Link>
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
