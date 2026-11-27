import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import {
  describeSchedule,
  formatPhoneForDisplay,
  formatPrice,
} from "@/lib/booking";
import { BUSINESS_FALLBACK } from "@/lib/business";
import { loadBusinessContext } from "@/lib/booking-data";
import { buildWhatsAppLink } from "@/lib/whatsapp";

// Los datos vienen de Supabase y cambian sin deploy (Fase 1.5). Sin esto Next
// prerenderiza la portada en el build y se queda con datos viejos.
export const dynamic = "force-dynamic";

const SECTION_PADDING = "px-4 py-14 sm:px-6 sm:py-20 lg:px-8";

export default async function Home() {
  const context = await loadBusinessContext();

  const name = context?.business.name ?? BUSINESS_FALLBACK.name;
  const whatsappPhone =
    context?.business.whatsappPhone ?? BUSINESS_FALLBACK.whatsappPhone;
  const whatsappLink = buildWhatsAppLink({ phone: whatsappPhone });
  const schedule = context ? describeSchedule(context.schedule) : null;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <SiteHeader businessName={name} />

      <main className="flex-1">
        <section className="relative isolate min-h-[calc(100svh-82px)] overflow-hidden border-b border-line/70">
          <Image
            src="/images/hero-barbero.webp"
            alt="Chata cortando el cabello de un cliente en la barbería"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[61%_center] sm:object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,17,17,0.12)_0%,rgba(17,17,17,0.28)_30%,rgba(17,17,17,0.96)_82%,#111111_100%)] sm:bg-[linear-gradient(90deg,rgba(17,17,17,0.96)_0%,rgba(17,17,17,0.72)_42%,rgba(17,17,17,0.12)_76%),linear-gradient(0deg,#111111_0%,transparent_35%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1 bg-copper"
          />

          <div className="relative mx-auto flex min-h-[calc(100svh-82px)] w-full max-w-6xl flex-col justify-end px-5 pt-52 pb-10 sm:justify-center sm:px-6 sm:py-24 lg:px-8">
            <div className="max-w-2xl">
              <p className="eyebrow">Cortes · cita previa</p>
              <h1 className="mt-4 max-w-[12ch] text-[3.4rem] leading-[0.9] font-extrabold tracking-[-0.015em] text-balance uppercase sm:text-7xl lg:text-8xl">
                Tu corte, sin llamadas ni esperas.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#d2d2d2] sm:text-lg">
                Elige tu espacio, deja tu nombre y teléfono, y listo. Reserva en
                línea, sin crear cuenta.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/reservar"
                  className="inline-flex min-h-14 items-center justify-center rounded-lg bg-copper px-6 text-center text-base font-bold text-sand transition-colors active:bg-copper-dark sm:min-w-64"
                >
                  Ver horarios disponibles
                </Link>
                <a
                  href="#el-local"
                  className="inline-flex min-h-14 items-center justify-center rounded-lg border border-white/35 bg-black/25 px-6 text-center text-sm font-semibold text-ink backdrop-blur-sm transition-colors active:bg-black/50"
                >
                  Conoce el local
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="horarios" className={`${SECTION_PADDING} scroll-mt-6`}>
          <div className="mx-auto w-full max-w-6xl">
            <p className="eyebrow">Tu próxima cita</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="max-w-xl text-4xl leading-none uppercase sm:text-5xl">
                Todo claro antes de reservar
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
                Solo necesitas elegir día y hora. Nosotros nos encargamos del
                resto.
              </p>
            </div>

            {context ? (
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <article className="urban-card relative overflow-hidden p-5 sm:p-6">
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-1 bg-copper"
                  />
                  <p className="text-xs font-bold tracking-[0.16em] text-ink-soft uppercase">
                    Servicio
                  </p>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <h3 className="text-3xl uppercase">
                      {context.service.name}
                    </h3>
                    <p className="text-3xl font-bold text-copper">
                      {formatPrice(
                        context.service.priceCents,
                        context.business.currency,
                      )}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    Bloques de {context.service.durationMinutes} minutos
                  </p>
                </article>

                <article className="urban-card p-5 sm:p-6">
                  <p className="text-xs font-bold tracking-[0.16em] text-ink-soft uppercase">
                    Horario
                  </p>
                  <h3 className="mt-3 text-2xl leading-tight capitalize">
                    {schedule?.days}
                  </h3>
                  {schedule?.hours ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {schedule.hours}
                    </p>
                  ) : null}
                </article>
              </div>
            ) : (
              <p
                role="alert"
                className="mt-8 rounded-xl border border-amber-400/40 bg-amber-950/50 px-4 py-4 text-sm leading-relaxed text-amber-100"
              >
                No pudimos cargar el servicio y el horario. Inténtalo de nuevo
                en un momento o consúltanos por WhatsApp.
              </p>
            )}

            <ol className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                [
                  "01",
                  "Elige fecha y hora",
                  "Ves solo los espacios disponibles.",
                ],
                ["02", "Deja tus datos", "Solo tu nombre y tu teléfono."],
                ["03", "Guarda tu cita", "Tendrás tu enlace para gestionarla."],
              ].map(([step, title, detail]) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-xl border border-line/70 bg-surface/45 p-4"
                >
                  <span className="font-display text-2xl leading-none font-bold text-copper">
                    {step}
                  </span>
                  <div>
                    <h3 className="font-sans text-sm font-semibold tracking-normal">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm text-ink-soft">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <Link
              href="/reservar"
              className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-lg bg-copper px-6 text-base font-bold text-sand transition-colors active:bg-copper-dark sm:w-auto sm:min-w-64"
            >
              Reservar mi cita
            </Link>
          </div>
        </section>

        <section
          id="el-local"
          className="border-y border-line/70 bg-surface/55"
        >
          <div
            className={`${SECTION_PADDING} mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-2 md:items-center`}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line shadow-2xl shadow-black/30">
              <Image
                src="/images/local-gamer.webp"
                alt="Ilustración del local con zona gaming, coleccionables y puesto de barbero"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent"
              />
              <p className="absolute bottom-4 left-4 rounded-md border border-white/20 bg-black/65 px-3 py-2 text-[10px] font-bold tracking-[0.18em] uppercase backdrop-blur-sm">
                Barbería · cultura · colección
              </p>
            </div>
            <div>
              <p className="eyebrow">El local</p>
              <h2 className="mt-4 text-4xl leading-[0.95] uppercase sm:text-5xl">
                Un espacio con personalidad
              </h2>
              <p className="mt-5 text-base leading-relaxed text-[#c7c7c7]">
                Coleccionables, referencias gamer y una barra con identidad
                propia. Un espacio oscuro, ordenado y pensado para que te
                sientas en tu ambiente.
              </p>
              <div className="mt-6 flex items-center gap-3 text-xs font-semibold tracking-[0.12em] text-ink-soft uppercase">
                <span className="h-px w-10 bg-copper" aria-hidden="true" />
                Aquí vienes a ser tú
              </div>
            </div>
          </div>
        </section>

        <section
          className={`${SECTION_PADDING} mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center`}
        >
          <div className="relative mx-auto aspect-square w-full max-w-md md:aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-panel">
            <Image
              src="/images/barbero-retrato.webp"
              alt="Retrato de Chata dentro de la barbería"
              fill
              sizes="(min-width: 768px) min(42vw, 28rem), 100vw"
              className="object-cover object-center"
            />
          </div>
          <div className="md:pl-4">
            <p className="eyebrow">Detrás de la silla</p>
            <h2 className="mt-4 text-4xl leading-[0.95] uppercase sm:text-5xl">
              Jonathan Madrigal, Chata Barber
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-soft">
              Tu cita es tu espacio: ven con tu idea, conversamos y buscamos un
              corte que vaya contigo. Sin prisas para elegir el horario: hazlo
              desde tu celular cuando te quede bien.
            </p>
            <Link
              href="/reservar"
              className="mt-6 inline-flex min-h-12 items-center rounded-lg border border-copper/70 px-5 text-sm font-bold text-copper transition-colors active:bg-copper active:text-sand"
            >
              Elegir mi horario
            </Link>
          </div>
        </section>

        <section className="border-y border-line/70 bg-[#161616]">
          <div
            className={`${SECTION_PADDING} mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-2 md:items-center`}
          >
            <div className="md:order-2">
              <div className="relative aspect-[5/4] overflow-hidden rounded-2xl border border-line bg-panel">
                <Image
                  src="/images/barbero-gamer.webp"
                  alt="Chata en su sala gamer rodeado de su colección"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover object-[center_32%]"
                />
              </div>
            </div>
            <div className="md:order-1">
              <p className="eyebrow">Modo colección</p>
              <h2 className="mt-4 max-w-md text-4xl leading-[0.95] uppercase sm:text-5xl">
                Barbería y mundo gamer, en el mismo lugar
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
                Consolas, figuras y detalles que hacen de este espacio algo más
                que una barbería. La colección pone la personalidad; la cita
                sigue siendo el plan.
              </p>
            </div>
          </div>
        </section>

        <section id="contacto" className={`${SECTION_PADDING}`}>
          <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
            <div>
              <p className="eyebrow">Nos vemos en la silla</p>
              <h2 className="mt-4 max-w-xl text-4xl leading-[0.95] uppercase sm:text-6xl">
                Tu próximo corte está a unos toques:
              </h2>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/reservar"
                  className="inline-flex min-h-14 items-center justify-center rounded-lg bg-copper px-7 text-base font-bold text-sand transition-colors active:bg-copper-dark"
                >
                  Reservar ahora
                </Link>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-14 items-center justify-center rounded-lg border border-line bg-surface px-7 text-sm font-bold text-ink transition-colors active:bg-panel"
                >
                  Escribir por WhatsApp
                </a>
              </div>
            </div>

            <dl className="urban-card grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <dt className="text-xs font-bold tracking-[0.14em] text-copper uppercase">
                  Horario
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink">
                  {schedule ? (
                    <>
                      <span className="block capitalize">{schedule.days}</span>
                      {schedule.hours ? (
                        <span className="mt-1 block text-ink-soft">
                          {schedule.hours}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-ink-soft">
                      Consulta el horario por WhatsApp.
                    </span>
                  )}
                </dd>
              </div>
              <div className="border-t border-line/70 pt-4">
                <dt className="text-xs font-bold tracking-[0.14em] text-copper uppercase">
                  Ubicación
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink">
                  {context?.business.address ??
                    "Consulta la dirección por WhatsApp."}
                </dd>
              </div>
              <div className="border-t border-line/70 pt-4">
                <dt className="text-xs font-bold tracking-[0.14em] text-copper uppercase">
                  WhatsApp
                </dt>
                <dd className="mt-2 text-sm">
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center rounded underline decoration-copper underline-offset-4"
                  >
                    {formatPhoneForDisplay(whatsappPhone)}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/70 bg-[#0d0d0d]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-7 text-xs leading-relaxed text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-display text-xl font-semibold tracking-wide text-ink uppercase">
            {name}
          </p>
          <p>Costa Rica · Reservas en línea · Sin crear cuenta</p>
        </div>
      </footer>
    </div>
  );
}
