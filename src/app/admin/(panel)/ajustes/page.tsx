import Link from "next/link";
import { redirect } from "next/navigation";

import { BusinessSettingsForm } from "@/components/admin/business-settings-form";
import { ServicePriceForm } from "@/components/admin/service-price-form";
import {
  ADMIN_CARD_CLASS,
  ADMIN_ERROR_BOX_CLASS,
} from "@/components/admin/admin-shared";
import { loadAdminBusinessSettings, loadAdminServices } from "@/lib/admin-data";
import { formatPhoneForDisplay, formatPrice } from "@/lib/booking";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const RETRY_LINK_CLASS =
  "inline-flex min-h-12 items-center rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors active:bg-panel";

export default async function AjustesPage() {
  const access = await getAdminAccess();

  if (access.status !== "ok") {
    redirect("/admin/login");
  }

  const [settings, services] = await Promise.all([
    loadAdminBusinessSettings(access.barber.businessId),
    loadAdminServices(access.barber.businessId),
  ]);

  if (settings === null || services === null) {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl leading-none uppercase">Ajustes</h1>
        <p role="alert" className={ADMIN_ERROR_BOX_CLASS}>
          No pudimos cargar los ajustes ahora mismo. Inténtalo de nuevo en un
          momento.
        </p>
        <Link href="/admin/ajustes" className={RETRY_LINK_CLASS}>
          Intentar de nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <h1 className="text-4xl leading-none uppercase">Ajustes</h1>

      <section aria-labelledby="datos-negocio" className="space-y-3">
        <h2 id="datos-negocio" className="text-2xl text-ink uppercase">
          Datos del negocio
        </h2>
        <p className="text-sm text-ink-soft">
          Estos son los datos que ven tus clientes al reservar.
        </p>
        <section className={ADMIN_CARD_CLASS}>
          <BusinessSettingsForm
            initialName={settings.name}
            initialWhatsapp={formatPhoneForDisplay(settings.whatsappPhone)}
            initialAddress={settings.address ?? ""}
          />
        </section>
      </section>

      <section aria-labelledby="precios" className="space-y-3">
        <h2 id="precios" className="text-2xl text-ink uppercase">
          Precios
        </h2>
        {services.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface/60 px-4 py-3 text-sm text-ink-soft">
            No hay servicios activos.
          </p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <section
                key={service.id}
                aria-labelledby={`servicio-${service.id}`}
                className={ADMIN_CARD_CLASS}
              >
                <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3
                    id={`servicio-${service.id}`}
                    className="text-base font-semibold text-ink"
                  >
                    {service.name}
                  </h3>
                  <p className="text-sm text-ink-soft">
                    {formatPrice(service.priceCents)}
                  </p>
                </header>
                <ServicePriceForm
                  serviceId={service.id}
                  priceCents={service.priceCents}
                />
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
