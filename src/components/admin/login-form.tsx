"use client";

import { useActionState } from "react";

import { signInAction } from "@/actions/auth";
import { initialLoginState } from "@/lib/auth-state";
import {
  ADMIN_ERROR_BOX_CLASS,
  ADMIN_INPUT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from "@/components/admin/admin-shared";

/** Formulario de inicio de sesión: email y contraseña. */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialLoginState,
  );

  const error = state.status === "error" ? state : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {error ? (
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          {error.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
          aria-invalid={error?.field === "email" || undefined}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-ink"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={error?.field === "password" || undefined}
          className={`mt-1.5 ${ADMIN_INPUT_CLASS}`}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={ADMIN_PRIMARY_BUTTON_CLASS}
      >
        {pending ? "Iniciando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
