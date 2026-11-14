import Link from "next/link";

/**
 * Marcador de posición de la Fase 0. La reserva real llega en la Fase 1.2.
 */
export default function ReservarPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-14">
      <p className="text-xs font-semibold tracking-[0.18em] text-copper uppercase">
        Próximamente
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        La reserva en línea está casi lista.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Estamos conectando la agenda del barbero. Muy pronto podrás elegir tu
        espacio de 30 minutos desde aquí.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-6 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
