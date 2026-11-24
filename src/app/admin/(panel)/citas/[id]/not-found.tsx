import Link from "next/link";

/** Cita que no existe o es de otro barbero. */
export default function CitasDetalleNotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        No encontramos esta cita
      </h1>
      <p className="text-sm leading-relaxed text-ink-soft">
        El enlace puede estar incompleto o la cita ya no existe. Vuelve a la
        agenda para ver lo que tienes ahora.
      </p>
      <Link
        href="/admin"
        className="inline-flex min-h-12 items-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-sand-deep"
      >
        Volver a la agenda
      </Link>
    </div>
  );
}
