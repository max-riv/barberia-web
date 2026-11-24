"use client";

import { signOutAction } from "@/actions/auth";
import { ADMIN_SECONDARY_BUTTON_CLASS } from "@/components/admin/admin-shared";

/** Formulario que cierra la sesión del panel (redirige al login). */
export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button type="submit" className={ADMIN_SECONDARY_BUTTON_CLASS}>
        Cerrar sesión
      </button>
    </form>
  );
}
