"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/admin";
import {
  ADMIN_GENERIC_ERROR,
  ADMIN_UNAVAILABLE_ERROR,
  mapAdminError,
  type AdminServicePriceState,
  type AdminSettingsState,
} from "@/lib/admin-state";
import { normalizeCostaRicaPhone } from "@/lib/booking";
import {
  parseUpdatedBusinessSettings,
  parseUpdatedServicePrice,
} from "@/lib/settings";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth";

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const MIN_BUSINESS_NAME = 2;
const MAX_BUSINESS_NAME = 120;
const MAX_ADDRESS = 200;

/** Precio en colones: entero sin decimales. */
const PRICE_PATTERN = /^\d+$/;
const MAX_PRICE_COLONES = 100000;

/**
 * Actualiza los datos del negocio que se muestran al público (nombre,
 * WhatsApp y dirección). La base de datos vuelve a validar todo antes de
 * guardar; aquí solo se valida la forma y se traducen los errores.
 */
export async function updateBusinessSettingsAction(
  _previousState: AdminSettingsState,
  formData: FormData,
): Promise<AdminSettingsState> {
  const name = readString(formData.get("nombre")).replace(/\s+/g, " ").trim();

  if (name.length < MIN_BUSINESS_NAME || name.length > MAX_BUSINESS_NAME) {
    return {
      status: "error",
      message: "Escribe el nombre del negocio (entre 2 y 120 caracteres).",
      field: "name",
    };
  }

  const whatsappPhone = normalizeCostaRicaPhone(
    readString(formData.get("whatsapp")),
  );

  if (!whatsappPhone) {
    return {
      status: "error",
      message: "Ese teléfono no parece válido. Usa un número de Costa Rica.",
      field: "phone",
    };
  }

  const address = readString(formData.get("direccion")).trim();

  if (address.length > MAX_ADDRESS) {
    return {
      status: "error",
      message: "La dirección no puede pasar de 200 caracteres.",
      field: "address",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { status: "error", message: ADMIN_UNAVAILABLE_ERROR };
  }

  const { data, error } = await supabase.rpc("admin_update_business_settings", {
    p_name: name,
    p_whatsapp_phone: whatsappPhone,
    p_address: address === "" ? null : address,
  });

  if (error) {
    const mapped = mapAdminError(String(error.message));
    return { status: "error", message: mapped.message, field: mapped.field };
  }

  const settings = parseUpdatedBusinessSettings(data);

  if (!settings) {
    return { status: "error", message: ADMIN_GENERIC_ERROR };
  }

  revalidatePath("/");
  revalidatePath("/reservar");
  revalidatePath("/admin");
  revalidatePath("/admin/ajustes");

  return {
    status: "updated",
    name: settings.name,
    whatsappPhone: settings.whatsappPhone,
    address: settings.address,
  };
}

/**
 * Cambia el precio de un servicio en colones (por ejemplo `6000` guarda
 * `600000` centavos). La base de datos vuelve a validar el servicio y el
 * rango del precio.
 */
export async function updateServicePriceAction(
  _previousState: AdminServicePriceState,
  formData: FormData,
): Promise<AdminServicePriceState> {
  const serviceId = readString(formData.get("servicio")).trim();

  if (!isUuid(serviceId)) {
    return {
      status: "error",
      message: "Elige un servicio.",
      field: "service",
    };
  }

  const rawPrice = readString(formData.get("precio")).trim();

  if (!PRICE_PATTERN.test(rawPrice)) {
    return {
      status: "error",
      message:
        "Escribe el precio en colones, sin decimales (por ejemplo 6000).",
      field: "price",
    };
  }

  const colones = Number(rawPrice);

  if (!Number.isInteger(colones) || colones > MAX_PRICE_COLONES) {
    return {
      status: "error",
      message: "El precio debe estar entre ₡0 y ₡100.000.",
      field: "price",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { status: "error", message: ADMIN_UNAVAILABLE_ERROR };
  }

  const { data, error } = await supabase.rpc("admin_update_service_price", {
    p_service_id: serviceId,
    p_price_cents: colones * 100,
  });

  if (error) {
    const mapped = mapAdminError(String(error.message));
    return { status: "error", message: mapped.message, field: mapped.field };
  }

  const updated = parseUpdatedServicePrice(data);

  if (!updated) {
    return { status: "error", message: ADMIN_GENERIC_ERROR };
  }

  revalidatePath("/");
  revalidatePath("/reservar");
  revalidatePath("/admin");
  revalidatePath("/admin/ajustes");

  return {
    status: "updated",
    serviceId: updated.serviceId,
    priceCents: updated.priceCents,
  };
}
