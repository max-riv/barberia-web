import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { describeSchedule, formatPrice } from "@/lib/booking";
import { BUSINESS_FALLBACK } from "@/lib/business";
import { loadBusinessContext } from "@/lib/booking-data";

// Los datos vienen de Supabase y cambian sin deploy (Fase 1.5). Sin esto Next
// prerenderiza la portada en el build y se queda con datos viejos.
export const dynamic = "force-dynamic";

export default async function Home() {
  const context = await loadBusinessContext();

  const name = context?.business.name ?? BUSINESS_FALLBACK.name;
  const serviceName = context?.service.name ?? "Corte";
  const durationMinutes = context?.service.durationMinutes ?? 30;
  const price = context
    ? formatPrice(context.service.priceCents, context.business.currency)
    : null;
  const schedule = context
    ? describeSchedule(context.schedule)
    : { days: "Miércoles cerrado", hours: "08:00 a 12:00 y 13:00 a 18:00" };
  const address = context?.business.address ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader businessName={name} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5">
        <section className="pt-10 pb-8 sm:pt-16">
          <p className="text-xs font-semibold tracking-[0.18em] text-copper uppercase">
            Reservas en línea
          </p>
          <h1 className="mt-3 max-w-xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl">
            Tu corte, sin llamadas ni esperas.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
            Elige el espacio de {durationMinutes} minutos que te sirva, deja tu
            nombre y teléfono, y listo. Sin crear cuenta.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/reservar"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-6 text-sm font-semibold text-sand transition-colors hover:bg-ink-soft"
            >
              Reservar mi cita
            </Link>
            <a
              href="#horarios"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-6 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep"
            >
              Ver horarios
            </a>
          </div>
        </section>

        <section
          id="horarios"
          className="grid gap-4 pb-12 sm:grid-cols-2"
          aria-label="Servicio y horarios"
        >
          <article className="rounded-2xl border border-line bg-white/60 p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
              Servicio
            </p>
            <h2 className="mt-2 text-xl font-semibold">{serviceName}</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Bloques de {durationMinutes} minutos
              {price ? ` · ${price}` : ""}
            </p>
          </article>

          <article className="rounded-2xl border border-line bg-white/60 p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
              Horario
            </p>
            <h2 className="mt-2 text-xl font-semibold capitalize">
              {schedule.days}
            </h2>
            {schedule.hours ? (
              <p className="mt-1 text-sm text-ink-soft">{schedule.hours}</p>
            ) : null}
          </article>
        </section>

        <section className="pb-14" aria-labelledby="como-funciona">
          <h2 id="como-funciona" className="text-lg font-semibold">
            Cómo funciona
          </h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Elige fecha y hora", "Ves solo los espacios disponibles."],
              ["2", "Deja tu nombre", "Tu teléfono, para confirmar la cita."],
              ["3", "Queda reservada", "Te esperamos en el local."],
            ].map(([step, title, detail]) => (
              <li
                key={step}
                className="rounded-2xl border border-line bg-white/40 p-4"
              >
                <span className="grid size-7 place-items-center rounded-full bg-sand-deep text-xs font-semibold text-ink">
                  {step}
                </span>
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{detail}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line/70">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-5 py-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            {name}
            {address ? ` · ${address}` : ""}
          </p>
          <p>Hecho para reservar desde el celular.</p>
        </div>
      </footer>
    </div>
  );
}
