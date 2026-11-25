import Link from "next/link";

import { ADMIN_SECONDARY_BUTTON_CLASS } from "@/components/admin/admin-shared";

/** Agenda que no existe: mismo 404 amable para todas las rutas del panel. */
export default function AdminPanelNotFound() {
  return (
    <div className="urban-card max-w-2xl p-5 sm:p-6">
      <p className="eyebrow">Página no encontrada</p>
      <h1 className="mt-4 text-4xl leading-none uppercase">
        No encontramos esta página
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        La dirección puede estar incompleta o la página ya no existe.
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
