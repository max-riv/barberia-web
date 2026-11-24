import type { ReactNode } from "react";

import { ADMIN_DETAIL_LABEL_CLASS } from "@/components/admin/admin-shared";

/** Rótulo y valor de un campo en la tarjeta de detalle de cita. */
export function AdminDetail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className={ADMIN_DETAIL_LABEL_CLASS}>{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">
        {children}
      </dd>
    </div>
  );
}
