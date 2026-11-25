import { SiteHeader } from "@/components/site-header";
import { BUSINESS_FALLBACK } from "@/lib/business";

export default function ReservarLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader businessName={BUSINESS_FALLBACK.name} />
      <main
        className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6"
        aria-busy="true"
      >
        <span className="sr-only" role="status">
          Cargando los horarios disponibles…
        </span>
        <section className="border-b border-line/70 pt-8 pb-7">
          <div className="h-4 w-36 animate-pulse rounded-full bg-panel" />
          <div className="mt-5 h-14 w-3/4 animate-pulse rounded-lg bg-panel" />
          <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-panel/80" />
        </section>
        <div className="mt-7 h-8 w-44 animate-pulse rounded bg-panel" />
        <div className="mt-4 flex gap-2.5 overflow-hidden">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-[76px] w-[68px] shrink-0 animate-pulse rounded-xl border border-line bg-surface"
            />
          ))}
        </div>
        <div className="mt-7 h-8 w-44 animate-pulse rounded bg-panel" />
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface p-4">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-12 animate-pulse rounded-lg bg-panel"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
