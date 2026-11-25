import Link from "next/link";

import { ADMIN_SECONDARY_BUTTON_CLASS } from "@/components/admin/admin-shared";

/** Cita que no existe o es de otro barbero. */
export default function CitasDetalleNotFound() {
  return (
    <div className="urban-card max-w-2xl p-5 sm:p-6">
      <p className="eyebrow">Cita no encontrada</p>
      <h1 className="mt-4 text-4xl leading-none uppercase">
        No encontramos esta cita
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        El enlace puede estar incompleto o la cita ya no existe. Vuelve a la
        agenda para ver lo que tienes ahora.
      </p>
      <Link
        href="/admin"
        className={`${ADMIN_SECONDARY_BUTTON_CLASS} mt-6 sm:max-w-48`}
      >
        Volver a la agenda
      </Link>
    </div>
  );
}
