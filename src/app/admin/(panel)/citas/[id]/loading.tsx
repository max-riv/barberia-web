/** Esqueleto del detalle de cita mientras carga. */
export default function CitasDetalleLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only" role="status">
        Cargando el detalle de la cita…
      </span>
      <div className="h-8 w-3/4 animate-pulse rounded-lg bg-sand-deep" />
      <div className="mt-4 h-5 w-1/3 animate-pulse rounded bg-sand-deep/60" />
      <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded bg-sand-deep/80" />
      <div className="mt-6 h-40 w-full animate-pulse rounded-2xl bg-sand-deep/40" />
      <div className="h-12 w-full animate-pulse rounded-xl bg-sand-deep/60" />
    </div>
  );
}
