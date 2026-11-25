/** Esqueleto de la página de ajustes. */
export default function AjustesLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only" role="status">
        Cargando los ajustes…
      </span>
      <div className="h-8 w-1/3 animate-pulse rounded-lg bg-sand-deep" />
      <div className="h-5 w-1/2 animate-pulse rounded bg-sand-deep" />
      <div className="h-44 w-full animate-pulse rounded-2xl bg-sand-deep/60" />
      <div className="h-5 w-1/2 animate-pulse rounded bg-sand-deep" />
      <div className="h-36 w-full animate-pulse rounded-2xl bg-sand-deep/60" />
    </div>
  );
}
