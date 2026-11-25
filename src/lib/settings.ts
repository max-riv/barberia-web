function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Datos del negocio que edita el panel. */
export type AdminBusinessSettings = {
  businessId: string;
  name: string;
  whatsappPhone: string;
  address: string | null;
};

/**
 * Valida una fila con `id, name, whatsapp_phone, address` (columna de id
 * configurable: el select directo usa `id` y la RPC usa `business_id`).
 */
function parseSettingsRow(
  row: unknown,
  idKey: "id" | "business_id",
): AdminBusinessSettings | null {
  if (!isRecord(row)) {
    return null;
  }

  const businessId = row[idKey];
  const name = row.name;
  const whatsappPhone = row.whatsapp_phone;
  const address = row.address;

  if (
    typeof businessId !== "string" ||
    typeof name !== "string" ||
    typeof whatsappPhone !== "string" ||
    (address !== null && typeof address !== "string")
  ) {
    return null;
  }

  return {
    businessId,
    name,
    whatsappPhone,
    address: typeof address === "string" ? address : null,
  };
}

/**
 * Fila de un select directo a `businesses` (`id, name, whatsapp_phone,
 * address`). Devuelve `null` si la forma no cuadra.
 */
export function parseAdminBusinessSettings(
  row: unknown,
): AdminBusinessSettings | null {
  // Tolera que llegue el data de un select sin `.single()`.
  return parseSettingsRow(Array.isArray(row) ? row[0] : row, "id");
}

/** Una fila de `admin_update_business_settings`. */
export function parseUpdatedBusinessSettings(
  data: unknown,
): AdminBusinessSettings | null {
  const row: unknown = Array.isArray(data) ? data[0] : null;

  return parseSettingsRow(row, "business_id");
}

/** Una fila de `admin_update_service_price`. */
export function parseUpdatedServicePrice(data: unknown): {
  serviceId: string;
  name: string;
  priceCents: number;
} | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row: unknown = data[0];

  if (!isRecord(row)) {
    return null;
  }

  const serviceId = row.service_id;
  const name = row.name;
  const priceCents = row.price_cents;

  if (
    typeof serviceId !== "string" ||
    typeof name !== "string" ||
    !isFiniteNumber(priceCents)
  ) {
    return null;
  }

  return { serviceId, name, priceCents };
}
