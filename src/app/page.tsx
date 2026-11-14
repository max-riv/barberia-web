import Link from "next/link";

/**
 * Fase 0: datos de ejemplo. En la Fase 1.5 pasan a leerse desde la tabla
 * `businesses` y `services` en Supabase.
 */
const BUSINESS = {
  name: "Barbería El Corte",
  serviceName: "Corte clásico",
  durationMinutes: 30,
  schedule: "Lunes a sábado · 9:00 a 18:00",
  breakTime: "Descanso de 12:00 a 13:00",
};

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line/70">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-4">
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-ink text-sm font-semibold text-sand"
            >
              B
            </span>
            <span className="text-sm font-semibold tracking-tight">
              {BUSINESS.name}
            </span>
          </span>
          <span className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-soft">
            Versión en construcción
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5">
        <section className="pt-10 pb-8 sm:pt-16">
          <p className="text-xs font-semibold tracking-[0.18em] text-copper uppercase">
            Reservas en línea
          </p>
          <h1 className="mt-3 max-w-xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl">
            Tu corte, sin llamadas ni esperas.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
            Elige el espacio de 30 minutos que te sirva, deja tu nombre y
            teléfono, y listo. Sin crear cuenta.
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
            <h2 className="mt-2 text-xl font-semibold">
              {BUSINESS.serviceName}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Bloques de {BUSINESS.durationMinutes} minutos · precio por
              confirmar
            </p>
          </article>

          <article className="rounded-2xl border border-line bg-white/60 p-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
              Horario
            </p>
            <h2 className="mt-2 text-xl font-semibold">{BUSINESS.schedule}</h2>
            <p className="mt-1 text-sm text-ink-soft">{BUSINESS.breakTime}</p>
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
              ["3", "Confirma por WhatsApp", "Un enlace con el mensaje listo."],
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
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-5 py-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            {BUSINESS.name} · Datos de ejemplo mientras terminamos la
            configuración.
          </p>
          <p>Hecho para reservar desde el celular.</p>
        </div>
      </footer>
    </div>
  );
}
