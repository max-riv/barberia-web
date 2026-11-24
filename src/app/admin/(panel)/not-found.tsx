import Link from "next/link";

/** Agenda que no existe: mismo 404 amable para todas las rutas del panel. */
export default function AdminPanelNotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        No encontramos esta página
      </h1>
      <p className="text-sm leading-relaxed text-ink-soft">
        La dirección puede estar incompleta o la página ya no existe.
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
