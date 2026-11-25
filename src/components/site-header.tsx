import Image from "next/image";
import Link from "next/link";

/** Cabecera común de la parte pública. */
export function SiteHeader({ businessName }: { businessName: string }) {
  return (
    <header className="relative z-50 border-b border-line/80 bg-sand/95 backdrop-blur-md">
      <div className="barber-stripe h-0.5 opacity-80" aria-hidden="true" />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center rounded-md"
          aria-label={businessName}
        >
          <Image
            src="/images/logo-charlies.png"
            alt={businessName}
            width={180}
            height={76}
            priority
            className="h-14 w-auto max-w-36 object-contain sm:h-16 sm:max-w-44"
          />
        </Link>
        <Link
          href="/reservar"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-copper px-4 text-sm font-bold text-sand transition-colors active:bg-copper-dark sm:px-5"
        >
          Reservar cita
        </Link>
      </div>
    </header>
  );
}
