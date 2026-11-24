/** Esqueleto de la agenda mientras carga. */
export default function AdminAgendaLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only" role="status">
        Cargando la agenda…
      </span>
      <div className="h-8 w-3/4 animate-pulse rounded-lg bg-sand-deep" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-sand-deep/80" />
      {[0, 1, 2].map((item) => (
        <div key={item} className="space-y-2">
          <div className="h-5 w-1/2 animate-pulse rounded bg-sand-deep" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-sand-deep/60" />
        </div>
      ))}
    </div>
  );
}
