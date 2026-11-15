import { BARBER_ID, BUSINESS_ID, SERVICE_ID } from "@/lib/business";
import { parseSlots, type BookingSlot, type ScheduleRow } from "@/lib/booking";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BusinessContext = {
  business: {
    id: string;
    name: string;
    whatsappPhone: string;
    address: string | null;
    currency: string;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceCents: number;
  };
  schedule: ScheduleRow[];
  openWeekdays: number[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Datos públicos del negocio para la portada y la página de reserva.
 * Devuelve `null` cuando la configuración o la base de datos no responden.
 */
export async function loadBusinessContext(): Promise<BusinessContext | null> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const [businessResult, serviceResult, scheduleResult] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, whatsapp_phone, address, currency")
      .eq("id", BUSINESS_ID)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents")
      .eq("id", SERVICE_ID)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("working_hours")
      .select("weekday, start_time, end_time")
      .eq("barber_id", BARBER_ID)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  if (
    businessResult.error ||
    serviceResult.error ||
    scheduleResult.error ||
    !isRecord(businessResult.data) ||
    !isRecord(serviceResult.data)
  ) {
    return null;
  }

  const business = businessResult.data;
  const service = serviceResult.data;

  const schedule: ScheduleRow[] = [];

  if (Array.isArray(scheduleResult.data)) {
    for (const row of scheduleResult.data) {
      if (!isRecord(row)) {
        continue;
      }

      const { weekday, start_time: startTime, end_time: endTime } = row;

      if (
        typeof weekday !== "number" ||
        typeof startTime !== "string" ||
        typeof endTime !== "string"
      ) {
        continue;
      }

      schedule.push({ weekday, startTime, endTime });
    }
  }

  if (schedule.length === 0) {
    return null;
  }

  const openWeekdays = [...new Set(schedule.map((row) => row.weekday))].sort(
    (a, b) => a - b,
  );

  return {
    business: {
      id: String(business.id),
      name: String(business.name),
      whatsappPhone: String(business.whatsapp_phone),
      address: typeof business.address === "string" ? business.address : null,
      currency: String(business.currency),
    },
    service: {
      id: String(service.id),
      name: String(service.name),
      durationMinutes: Number(service.duration_minutes),
      priceCents: Number(service.price_cents),
    },
    schedule,
    openWeekdays,
  };
}

/**
 * Espacios libres de un día. Devuelve `null` si la consulta falla, para
 * distinguirlo de "ese día está completo".
 */
export async function loadAvailableSlots(
  date: string,
): Promise<BookingSlot[] | null> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_available_slots", {
    p_barber_id: BARBER_ID,
    p_date: date,
  });

  if (error) {
    return null;
  }

  return parseSlots(data);
}
