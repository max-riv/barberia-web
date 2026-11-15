/**
 * Identificadores del negocio en la base de datos.
 *
 * Son fijos a propósito: mientras la app atienda una sola barbería, el servidor
 * los usa para llamar a las RPC. Coinciden con el seed de la migración de la
 * Fase 1.1 y con `docs/business.md`. Si cambian, hay que actualizar ambos.
 */
export const BUSINESS_ID = "00000000-0000-4000-8000-000000000001";
export const BARBER_ID = "00000000-0000-4000-8000-000000000002";
export const SERVICE_ID = "00000000-0000-4000-8000-000000000003";

/** Datos de respaldo si la base no responde. No sustituyen a Supabase. */
export const BUSINESS_FALLBACK = {
  name: "Charlie's Barbershop",
  whatsappPhone: "+50687677997",
} as const;
