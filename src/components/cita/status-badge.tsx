import type { AppointmentStatus } from "@/lib/appointment";

type StatusBadgeProps = {
  status: AppointmentStatus;
  /** Cita confirmada cuya hora de inicio ya pasó. */
  isPast?: boolean;
};

type BadgeTone = "confirmed" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  confirmed: "border-emerald-300 bg-emerald-50 text-emerald-900",
  neutral: "border-line bg-sand-deep text-ink",
};

function resolveBadge({ status, isPast }: StatusBadgeProps): {
  label: string;
  tone: BadgeTone;
} {
  switch (status) {
    case "cancelled":
      return { label: "Cancelada", tone: "neutral" };
    case "completed":
      return { label: "Completada", tone: "neutral" };
    case "no_show":
      return { label: "No asistió", tone: "neutral" };
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
      className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
