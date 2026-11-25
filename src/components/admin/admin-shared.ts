/** Estilos compartidos del panel del barbero: colores y tamaños de entrada. */
export const ADMIN_CARD_CLASS = "urban-card p-4 sm:p-5";

export const ADMIN_INPUT_CLASS =
  "min-h-12 w-full rounded-lg border border-line bg-panel px-3.5 py-3 text-base text-ink transition-colors placeholder:text-[#929292] focus:border-copper focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

export const ADMIN_PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-copper px-6 text-sm font-bold text-sand transition-colors active:bg-copper-dark disabled:cursor-not-allowed disabled:opacity-60";

export const ADMIN_SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors active:border-copper active:bg-panel disabled:cursor-not-allowed disabled:opacity-60";

export const ADMIN_ERROR_BOX_CLASS =
  "rounded-lg border border-red-400/50 bg-red-950/60 px-4 py-3 text-sm leading-relaxed text-red-100";

/** Aviso positivo (guardado, creado): discreto, con la paleta del panel. */
export const ADMIN_SUCCESS_BOX_CLASS =
  "rounded-lg border border-emerald-400/40 bg-emerald-950/55 px-4 py-3 text-sm leading-relaxed text-emerald-100";

/** Aviso que pide confirmación, como citas dentro de un bloqueo. */
export const ADMIN_WARNING_BOX_CLASS =
  "rounded-lg border border-amber-400/45 bg-amber-950/55 px-4 py-3 text-sm leading-relaxed text-amber-100";

export const ADMIN_DETAIL_LABEL_CLASS =
  "text-xs font-bold tracking-[0.13em] text-ink-soft uppercase";
