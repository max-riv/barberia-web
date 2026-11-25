import { SiteHeader } from "@/components/site-header";
import { BUSINESS_FALLBACK } from "@/lib/business";

/** Esqueleto mientras se consulta la cita en Supabase. */
export default function CitaLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader businessName={BUSINESS_FALLBACK.name} />

      <main
        className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16"
        aria-busy="true"
      >
        <span className="sr-only" role="status">
          Cargando tu cita…
        </span>

        <section className="pt-8 pb-6">
          <div className="h-3 w-24 animate-pulse rounded-full bg-sand-deep" />
          <div className="mt-4 h-8 w-3/4 animate-pulse rounded-lg bg-sand-deep" />
          <div className="mt-3 h-4 w-full max-w-sm animate-pulse rounded bg-sand-deep/80" />
        </section>

        <div className="rounded-2xl border border-line bg-surface/60 p-5">
          <div className="h-3 w-24 animate-pulse rounded-full bg-sand-deep" />
          <div className="mt-3 h-7 w-2/3 animate-pulse rounded-lg bg-sand-deep" />
          <div className="mt-2 h-5 w-32 animate-pulse rounded bg-sand-deep/80" />
          <div className="mt-5 grid gap-4 border-t border-line/70 pt-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item}>
                <div className="h-3 w-20 animate-pulse rounded-full bg-sand-deep" />
                <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-sand-deep/80" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-sand-deep" />
      </main>
    </div>
  );
}
