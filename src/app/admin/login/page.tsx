import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede al panel del barbero con tu email y contraseña.",
};

export default async function AdminLoginPage() {
  const access = await getAdminAccess();

  if (access.status === "ok") {
    redirect("/admin");
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 mx-auto h-1 max-w-6xl bg-copper"
      />
      <div className="urban-card w-full max-w-md p-6 sm:p-8">
        <div>
          <span
            aria-hidden="true"
            className="grid size-12 place-items-center rounded-lg border border-copper/60 bg-copper/10 font-display text-3xl font-bold text-copper"
          >
            C
          </span>
          <p className="eyebrow mt-6">Charlie&apos;s Barbershop</p>
          <h1 className="mt-3 text-5xl leading-none uppercase">
            Panel del barbero
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Accede con tu email y contraseña para gestionar la agenda.
          </p>
        </div>

        <div className="mt-7">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
