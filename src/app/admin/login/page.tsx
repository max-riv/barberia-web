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
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-line bg-white/70 p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Barbería</h1>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Accede con el email del barbero y su contraseña.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
