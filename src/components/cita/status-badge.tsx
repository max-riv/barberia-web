import type { AppointmentStatus } from "@/lib/appointment";

type StatusBadgeProps = {
  status: AppointmentStatus;
  /** Cita confirmada cuya hora de inicio ya pasó. */
  isPast?: boolean;
};

type BadgeTone =
  "confirmed" | "neutral" | "cancelled" | "completed" | "warning";

const TONE_CLASSES: Record<BadgeTone, string> = {
  confirmed: "border-emerald-400/45 bg-emerald-950/70 text-emerald-100",
  neutral: "border-line bg-panel text-[#d0d0d0]",
  cancelled: "border-red-400/45 bg-red-950/70 text-red-100",
  completed: "border-copper/50 bg-copper/10 text-[#efbd9b]",
  warning: "border-amber-400/45 bg-amber-950/70 text-amber-100",
};

function resolveBadge({ status, isPast }: StatusBadgeProps): {
  label: string;
  tone: BadgeTone;
} {
  switch (status) {
    case "cancelled":
      return { label: "Cancelada", tone: "cancelled" };
    case "completed":
      return { label: "Completada", tone: "completed" };
    case "no_show":
      return { label: "No asistió", tone: "warning" };
    default:
      return isPast
        ? { label: "Ya pasó", tone: "neutral" }
        : { label: "Confirmada", tone: "confirmed" };
  }
}

/** Etiqueta compacta del estado de la cita, sin depender del color. */
export function StatusBadge({ status, isPast = false }: StatusBadgeProps) {
  const { label, tone } = resolveBadge({ status, isPast });

  return (
    <span
      className={`inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 text-xs font-bold ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
