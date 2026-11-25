import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutForm } from "@/components/admin/sign-out-form";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/nueva", label: "Nueva cita" },
  { href: "/admin/horarios", label: "Horarios" },
  { href: "/admin/ajustes", label: "Ajustes" },
] as const;

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
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
          <div className="urban-card p-6">
            <p className="eyebrow">Cuenta sin vincular</p>
            <h1 className="mt-4 text-4xl leading-none text-balance uppercase">
              Tu cuenta no está vinculada al panel
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              El email <strong className="text-ink">{access.email}</strong> ya
              está registrado en la base de datos, pero no tiene un barbero
              activo vinculado. Cierra sesión para regresar al login o
              escríbenos por WhatsApp si necesitas ayuda.
            </p>
            <div className="mt-6">
              <SignOutForm />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { displayName } = access.barber;

  return (
    <div className="flex min-h-dvh flex-col bg-sand">
      <header className="border-b border-line bg-[#151515]">
        <div className="barber-stripe h-0.5 opacity-75" aria-hidden="true" />
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="flex min-w-0 items-center gap-3 rounded-md"
            aria-label="Ir a la agenda"
          >
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-lg border border-copper/60 bg-copper/10 font-display text-3xl font-bold text-copper"
            >
              C
            </span>
            <span className="min-w-0">
              <span className="block font-display text-xl leading-none font-bold tracking-wide text-ink uppercase">
                Panel del barbero
              </span>
              <span className="mt-1 block truncate text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
                Charlie&apos;s · {displayName}
              </span>
            </span>
          </Link>
          <div className="shrink-0">
            <SignOutForm />
          </div>
        </div>
        <nav
          className="mx-auto grid w-full max-w-5xl grid-cols-4 gap-1 px-4 pb-3 sm:px-6"
          aria-label="Navegación del panel"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line/70 bg-surface px-1 text-center text-[11px] font-semibold text-[#c4c4c4] transition-colors active:border-copper active:text-copper sm:text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-6 sm:py-9">
        {children}
      </main>
    </div>
  );
}
