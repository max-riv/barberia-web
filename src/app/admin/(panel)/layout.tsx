import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutForm } from "@/components/admin/sign-out-form";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAdminAccess();

  if (access.status === "unauthenticated") {
    redirect("/admin/login");
  }

  if (access.status === "unlinked") {
    return (
      <div className="flex min-h-dvh flex-col bg-sand">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
          <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">
            Cuenta sin vincular
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
            Tu cuenta no está vinculada al panel
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            El email <strong className="text-ink">{access.email}</strong> ya
            está registrado en la base de datos, pero no tiene un barbero activo
            vinculado. Cierra sesión para regresar al login o escríbenos por
            WhatsApp si necesitas ayuda.
          </p>
          <div className="mt-6">
            <SignOutForm />
          </div>
        </main>
      </div>
    );
  }

  const { displayName } = access.barber;

  return (
    <div className="flex min-h-dvh flex-col bg-sand">
      <header className="border-b border-line/70">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-5 py-4">
          <Link
            href="/admin"
            className="text-sm font-semibold tracking-tight text-ink"
          >
            {displayName}
          </Link>
          <SignOutForm />
        </div>
        <nav className="mx-auto flex w-full max-w-4xl gap-4 px-5 pb-3">
          <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">
            Agenda
          </Link>
          <Link
            href="/admin/nueva"
            className="text-sm text-ink-soft hover:text-ink"
          >
            Nueva cita
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-6">
        {children}
      </main>
    </div>
  );
}
