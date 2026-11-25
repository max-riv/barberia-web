"use server";

import { revalidatePath } from "next/cache";

import { isUuid } from "@/lib/admin";
import {
  ADMIN_GENERIC_ERROR,
  ADMIN_UNAVAILABLE_ERROR,
  mapAdminError,
  type AdminTimeOffDeleteState,
  type AdminTimeOffState,
  type AdminWorkingHoursState,
} from "@/lib/admin-state";
import { crLocalToIsoUtc, isIsoDate } from "@/lib/booking";
import { parseTimeOffCreation, type WorkingHoursRange } from "@/lib/schedule";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth";

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function readStrings(values: readonly FormDataEntryValue[]): string[] {
  return values.map((value) => (typeof value === "string" ? value : ""));
}

/** Horas del editor de horarios: solo en punto o y media. */
const WORKING_RANGE_TIME_PATTERN = /^([01][0-9]|2[0-3]):[03]0$/;

/** Horas de un bloqueo: cualquier minuto del día, o `24:00` para cerrarlo. */
const TIME_OFF_TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

const MAX_WORKING_RANGES = 4;
const MAX_TIME_OFF_REASON = 120;

function revalidateSchedulePages(): void {
  revalidatePath("/reservar");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/nueva");
  revalidatePath("/admin/horarios");
}

/**
 * Guarda los tramos de un día de la semana. Cero pares cierran el día. La
 * base de datos vuelve a validar el formato, la alineación y los solapes
 * (también entre ediciones simultáneas); aquí solo se valida la forma de
 * los datos y se traducen los errores.
 */
export async function setWorkingHoursAction(
  _previousState: AdminWorkingHoursState,
  formData: FormData,
): Promise<AdminWorkingHoursState> {
  const rawWeekday = readString(formData.get("dia")).trim();

  if (!/^[0-6]$/.test(rawWeekday)) {
    return {
      status: "error",
      message: "Ese día de la semana no es válido.",
      field: "weekday",
    };
  }

  const weekday = Number(rawWeekday);
  const starts = readStrings(formData.getAll("inicio")).map((value) =>
    value.trim(),
  );
  const ends = readStrings(formData.getAll("fin")).map((value) => value.trim());
  const pairCount = Math.max(starts.length, ends.length);

  const ranges: WorkingHoursRange[] = [];

  for (let index = 0; index < pairCount; index += 1) {
    const start = starts[index] ?? "";
    const end = ends[index] ?? "";

    // Los pares vacíos se ignoran: cero pares significa cerrar el día.
    if (start === "" && end === "") {
      continue;
    }

    if (start === "" || end === "") {
      return {
        status: "error",
        message: "Completa la hora de inicio y la de fin de cada tramo.",
        field: "ranges",
      };
    }

    if (
      !WORKING_RANGE_TIME_PATTERN.test(start) ||
      !WORKING_RANGE_TIME_PATTERN.test(end)
    ) {
      return {
        status: "error",
        message:
          "Cada tramo empieza y termina en punto o y media (por ejemplo 08:00 a 12:00).",
        field: "ranges",
      };
    }

    if (start >= end) {
      return {
        status: "error",
        message: "La hora de inicio tiene que ser antes de la de fin.",
        field: "ranges",
      };
    }

    ranges.push({ start, end });
  }

  if (ranges.length > MAX_WORKING_RANGES) {
    return {
      status: "error",
      message: "Máximo 4 tramos por día.",
      field: "ranges",
    };
  }

  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index - 1].end > sorted[index].start) {
      return {
        status: "error",
        message: "Los tramos no se pueden solapar. Ajusta las horas.",
        field: "ranges",
      };
    }
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { status: "error", message: ADMIN_UNAVAILABLE_ERROR };
  }

  const { error } = await supabase.rpc("admin_set_working_hours", {
    p_weekday: weekday,
    p_ranges: ranges,
  });

  if (error) {
    const mapped = mapAdminError(String(error.message));
    return { status: "error", message: mapped.message, field: mapped.field };
  }

  revalidateSchedulePages();

  return { status: "updated", weekday };
}

/**
 * Crea un bloqueo. Si hay citas confirmadas dentro del rango y no se mandó
 * `forzar=1`, no crea nada y devuelve el estado `"conflict"` con lo que el
 * usuario escribió, para que la UI ofrezca "Crear de todos modos". La base
 * de datos vuelve a validar fechas, motivo y solapes.
 */
export async function createTimeOffAction(
  _previousState: AdminTimeOffState,
  formData: FormData,
): Promise<AdminTimeOffState> {
  const fecha = readString(formData.get("fecha")).trim();
  const inicio = readString(formData.get("inicio")).trim();
  const fin = readString(formData.get("fin")).trim();
  const motivo = readString(formData.get("motivo")).trim();
  const forced = readString(formData.get("forzar")).trim() === "1";

  if (!isIsoDate(fecha)) {
    return {
      status: "error",
      message: "Elige una fecha válida.",
      field: "timeOff",
    };
  }

  if (!TIME_OFF_TIME_PATTERN.test(inicio)) {
    return {
      status: "error",
      message:
        "La hora de inicio debe tener el formato HH:MM (por ejemplo 08:00).",
      field: "timeOff",
    };
  }

  if (!TIME_OFF_TIME_PATTERN.test(fin) && fin !== "24:00") {
    return {
      status: "error",
      message:
        "La hora de fin debe tener el formato HH:MM (por ejemplo 12:30) o ser 24:00 para el fin del día.",
      field: "timeOff",
    };
  }

  if (fin !== "24:00" && fin <= inicio) {
    return {
      status: "error",
      message: "La hora de fin tiene que ser después de la de inicio.",
      field: "timeOff",
    };
  }

  if (motivo.length > MAX_TIME_OFF_REASON) {
    return {
      status: "error",
      message: "El motivo no puede pasar de 120 caracteres.",
      field: "reason",
    };
  }

  // La conversión usa el offset fijo de Costa Rica (UTC-06:00): no hay
  // reloj del servidor de por medio.
  const startsAt = crLocalToIsoUtc(fecha, inicio);
  const endsAt = crLocalToIsoUtc(fecha, fin);

  if (!startsAt || !endsAt) {
    return {
      status: "error",
      message: "Revisa la fecha y las horas del bloqueo.",
      field: "timeOff",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { status: "error", message: ADMIN_UNAVAILABLE_ERROR };
  }

  const { data, error } = await supabase.rpc("admin_create_time_off", {
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_reason: motivo === "" ? null : motivo,
    p_force: forced,
  });

  if (error) {
    const mapped = mapAdminError(String(error.message));
    return { status: "error", message: mapped.message, field: mapped.field };
  }

  const creation = parseTimeOffCreation(data);

  if (!creation) {
    return { status: "error", message: ADMIN_GENERIC_ERROR };
  }

  if (!creation.created) {
    // Hay citas confirmadas dentro del rango: se devuelve lo que el usuario
    // escribió, sin revalidar, para que la UI ofrezca "Crear de todos modos".
    return {
      status: "conflict",
      conflicts: creation.conflicts,
      fecha,
      inicio,
      fin,
      motivo,
    };
  }

  revalidateSchedulePages();

  return {
    status: "created",
    forced,
    conflicts: creation.conflicts,
  };
}

/** Borra un bloqueo del barbero autenticado. */
export async function deleteTimeOffAction(
  _previousState: AdminTimeOffDeleteState,
  formData: FormData,
): Promise<AdminTimeOffDeleteState> {
  const id = readString(formData.get("id")).trim();

  if (!isUuid(id)) {
    return {
      status: "error",
      message: "No encontramos ese bloqueo.",
      field: "timeOff",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { status: "error", message: ADMIN_UNAVAILABLE_ERROR };
  }

  const { error } = await supabase.rpc("admin_delete_time_off", {
    p_time_off_id: id,
  });

  if (error) {
    const mapped = mapAdminError(String(error.message));
    return { status: "error", message: mapped.message, field: mapped.field };
  }

  revalidateSchedulePages();

  return { status: "deleted" };
}
