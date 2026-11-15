import Link from "next/link";

/** Cabecera común de la parte pública. */
export function SiteHeader({ businessName }: { businessName: string }) {
  return (
    <header className="border-b border-line/70">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-full bg-ink text-sm font-semibold text-sand"
          >
            C
          </span>
          <span>{businessName}</span>
        </Link>
        <Link
          href="/reservar"
          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-sand-deep"
        >
          Reservar
        </Link>
      </div>
    </header>
  );
}
