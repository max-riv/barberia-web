#!/usr/bin/env node
/**
 * Verificación de la Fase 1.1 contra el proyecto real de Supabase.
 *
 * Comprueba, con la clave pública (anon), que las reglas de negocio son
 * imposibles de violar desde fuera y que RLS no filtra datos sensibles.
 *
 * Uso:
 *   node --env-file=.env.local scripts/db-smoke-test.mjs
 *
 * Aviso: crea citas de prueba y las cancela al terminar. Ejecútalo solo
 * contra el proyecto de desarrollo, nunca contra producción con clientes.
 */

import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Entorno
// ---------------------------------------------------------------------------

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;
    if (!process.env[name]) {
      process.env[name] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.",
  );
  process.exit(2);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Datos del seed (Charlie's Barbershop)
// ---------------------------------------------------------------------------

const BUSINESS_ID = "00000000-0000-4000-8000-000000000001";
const BARBER_ID = "00000000-0000-4000-8000-000000000002";
const SERVICE_ID = "00000000-0000-4000-8000-000000000003";

const SLOT_MINUTES = 30;
const CR_OFFSET_MS = 6 * 60 * 60 * 1000; // America/Costa_Rica = UTC-6
const CLOSED_WEEKDAY = 3; // miércoles

// Migraciones del panel, para que el aviso de "función no existe" apunte a la
// migración correcta.
const PHASE_14_MIGRATION =
  "supabase/migrations/20261124000000_fase_1_4_panel.sql";
const PHASE_15_MIGRATION =
  "supabase/migrations/20261124000001_fase_1_5_horarios_bloqueos_ajustes.sql";

// ---------------------------------------------------------------------------
// Utilidades de fecha (Costa Rica, sin horario de verano)
// ---------------------------------------------------------------------------

function shiftedDate(offsetDays) {
  return new Date(Date.now() - CR_OFFSET_MS + offsetDays * 86_400_000);
}

function isoDateCR(offsetDays) {
  return shiftedDate(offsetDays).toISOString().slice(0, 10);
}

function weekdayCR(offsetDays) {
  return shiftedDate(offsetDays).getUTCDay();
}

/** Primera fecha hábil a partir de `offsetDays` (salta los miércoles). */
function workingDate(offsetDays) {
  let offset = offsetDays;
  while (weekdayCR(offset) === CLOSED_WEEKDAY) {
    offset += 1;
  }
  return isoDateCR(offset);
}

/** Fecha y hora local de Costa Rica como "HH:MM". */
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Costa_Rica",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function localTime(iso) {
  return timeFormatter.format(new Date(iso));
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Costa_Rica",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function localDate(iso) {
  return dateFormatter.format(new Date(iso));
}

function toMinutes(hhmm) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

// ---------------------------------------------------------------------------
// Acceso a Supabase
// ---------------------------------------------------------------------------

async function getSlots(date) {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_barber_id: BARBER_ID,
    p_date: date,
  });

  if (error) {
    throw new Error(`get_available_slots: ${error.message}`);
  }

  return data ?? [];
}

function book(startsAt, options = {}) {
  const { name = "Prueba QA", phone = "87677997" } = options;

  return supabase.rpc("book_appointment", {
    p_barber_id: BARBER_ID,
    p_service_id: SERVICE_ID,
    p_starts_at: startsAt,
    p_customer_name: name,
    p_customer_phone: phone,
  });
}

function cancel(token) {
  return supabase.rpc("cancel_appointment", { p_token: token });
}

function expectError(result, code) {
  if (!result.error) {
    throw new Error(`se esperaba el error ${code}, pero la llamada funcionó`);
  }

  const message = String(result.error.message);
  if (!message.includes(code)) {
    throw new Error(`se esperaba ${code}, se recibió "${message}"`);
  }
}

/**
 * Comprueba que `anon` no tenga EXECUTE sobre una RPC del panel. Distingue el
 * permiso denegado de una función que todavía no existe para que el mensaje
 * apunte a la migración correcta.
 */
function expectPermissionDenied(
  result,
  name,
  migrationFile = PHASE_14_MIGRATION,
) {
  if (!result.error) {
    throw new Error(`anon pudo ejecutar ${name}`);
  }

  const message = String(result.error.message);

  if (/permission denied/i.test(message)) {
    return;
  }

  if (
    /does not exist|could not find the function|schema cache/i.test(message)
  ) {
    throw new Error(
      `la función ${name} no existe todavía; aplica ${migrationFile}`,
    );
  }

  throw new Error(
    `se esperaba un permiso denegado en ${name}, se recibió "${message}"`,
  );
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const results = [];
const bookedTokens = [];

async function run(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  \u2713 ${name}`);
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
    console.log(`  \u2717 ${name}\n      ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// Pruebas
// ---------------------------------------------------------------------------

async function main() {
  console.log("\nVerificación de la Fase 1.1 · Charlie's Barbershop\n");

  // --- Lectura pública ------------------------------------------------------
  await run("el negocio se puede leer sin autenticación", async () => {
    const { data, error } = await supabase
      .from("businesses")
      .select("name, slug, timezone, whatsapp_phone")
      .eq("id", BUSINESS_ID)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    assert(
      data.name === "Charlie's Barbershop",
      `nombre inesperado: ${data.name}`,
    );
    assert(data.timezone === "America/Costa_Rica", "zona horaria incorrecta");
    assert(data.whatsapp_phone === "+50687677997", "WhatsApp incorrecto");
  });

  // --- RLS ------------------------------------------------------------------
  await run("anon no puede leer citas ni bloqueos", async () => {
    const appointments = await supabase
      .from("appointments")
      .select("id")
      .limit(1);
    assert(Boolean(appointments.error), "anon pudo leer appointments");

    const timeOff = await supabase.from("time_off").select("id").limit(1);
    assert(Boolean(timeOff.error), "anon pudo leer time_off");
  });

  await run(
    "anon no puede leer el token de cancelación de una cita",
    async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("cancel_token")
        .limit(1);

      assert(
        Boolean(error) || (data ?? []).length === 0,
        "anon obtuvo cancel_token",
      );
    },
  );

  // --- Panel del barbero (Fase 1.4) ----------------------------------------
  await run("anon no puede leer appointments", async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("id")
      .limit(1);

    assert(
      Boolean(error) || (data ?? []).length === 0,
      "anon pudo leer appointments",
    );
  });

  await run("anon no puede ejecutar admin_get_agenda", async () => {
    const result = await supabase.rpc("admin_get_agenda", {
      p_from: isoDateCR(0),
      p_to: isoDateCR(7),
    });

    expectPermissionDenied(result, "admin_get_agenda");
  });

  await run("anon no puede ejecutar admin_create_appointment", async () => {
    const result = await supabase.rpc("admin_create_appointment", {
      p_service_id: SERVICE_ID,
      p_starts_at: `${isoDateCR(40)}T10:00:00-06:00`,
      p_customer_name: "Prueba QA",
      p_customer_phone: "87677997",
    });

    expectPermissionDenied(result, "admin_create_appointment");
  });

  await run("anon no puede ejecutar admin_set_appointment_status", async () => {
    const result = await supabase.rpc("admin_set_appointment_status", {
      p_appointment_id: "11111111-1111-4111-8111-111111111111",
      p_status: "cancelled",
    });

    expectPermissionDenied(result, "admin_set_appointment_status");
  });

  // --- Fase 1.5: horarios, descansos y ajustes -------------------------------
  // Estas comprobaciones solo pasan después de aplicar a mano
  // supabase/migrations/20261124000001_fase_1_5_horarios_bloqueos_ajustes.sql
  // en el SQL Editor (igual que las fases anteriores).

  await run("anon no puede ejecutar admin_set_working_hours", async () => {
    const result = await supabase.rpc("admin_set_working_hours", {
      p_weekday: 1,
      p_ranges: [{ start: "08:00", end: "12:00" }],
    });

    expectPermissionDenied(
      result,
      "admin_set_working_hours",
      PHASE_15_MIGRATION,
    );
  });

  await run("anon no puede ejecutar admin_create_time_off", async () => {
    const result = await supabase.rpc("admin_create_time_off", {
      p_starts_at: `${isoDateCR(40)}T08:00:00-06:00`,
      p_ends_at: `${isoDateCR(40)}T12:00:00-06:00`,
      p_reason: null,
      p_force: false,
    });

    expectPermissionDenied(result, "admin_create_time_off", PHASE_15_MIGRATION);
  });

  await run("anon no puede ejecutar admin_list_time_off", async () => {
    const result = await supabase.rpc("admin_list_time_off");

    expectPermissionDenied(result, "admin_list_time_off", PHASE_15_MIGRATION);
  });

  await run("anon no puede ejecutar admin_delete_time_off", async () => {
    const result = await supabase.rpc("admin_delete_time_off", {
      p_time_off_id: "11111111-1111-4111-8111-111111111111",
    });

    expectPermissionDenied(result, "admin_delete_time_off", PHASE_15_MIGRATION);
  });

  await run(
    "anon no puede ejecutar admin_update_business_settings",
    async () => {
      const result = await supabase.rpc("admin_update_business_settings", {
        p_name: "Negocio de prueba",
        p_whatsapp_phone: "87677997",
        p_address: null,
      });

      expectPermissionDenied(
        result,
        "admin_update_business_settings",
        PHASE_15_MIGRATION,
      );
    },
  );

  await run("anon no puede ejecutar admin_update_service_price", async () => {
    const result = await supabase.rpc("admin_update_service_price", {
      p_service_id: SERVICE_ID,
      p_price_cents: 600000,
    });

    expectPermissionDenied(
      result,
      "admin_update_service_price",
      PHASE_15_MIGRATION,
    );
  });

  // --- Disponibilidad -------------------------------------------------------
  const availabilityDate = workingDate(3);

  await run(
    `hay espacios en una fecha hábil (${availabilityDate})`,
    async () => {
      const slots = await getSlots(availabilityDate);
      assert(slots.length > 0, "no hay espacios disponibles");
    },
  );

  await run(
    "los espacios son de 30 min, alineados y dentro del horario",
    async () => {
      const slots = await getSlots(availabilityDate);
      assert(slots.length > 0, "no hay espacios para validar");

      for (const slot of slots) {
        const startMs = new Date(slot.slot_start).getTime();
        const endMs = new Date(slot.slot_end).getTime();

        assert(
          endMs - startMs === SLOT_MINUTES * 60_000,
          `duración distinta de 30 min en ${slot.slot_start}`,
        );

        const [hours, minutes] = localTime(slot.slot_start)
          .split(":")
          .map(Number);
        assert(
          minutes === 0 || minutes === 30,
          `slot desalineado: ${slot.slot_start}`,
        );

        const startMinutes = hours * 60 + minutes;
        assert(
          startMinutes >= toMinutes("08:00") &&
            startMinutes < toMinutes("18:00"),
          `slot fuera de horario: ${localTime(slot.slot_start)}`,
        );

        const inBreak =
          startMinutes >= toMinutes("12:00") &&
          startMinutes < toMinutes("13:00");
        assert(
          !inBreak,
          `slot dentro del descanso: ${localTime(slot.slot_start)}`,
        );

        assert(
          localDate(slot.slot_start) === availabilityDate,
          `slot en otra fecha: ${slot.slot_start}`,
        );
      }
    },
  );

  await run("no hay espacios a más de 30 días", async () => {
    const slots = await getSlots(isoDateCR(31));
    assert(
      slots.length === 0,
      `devolvió ${slots.length} espacios fuera de rango`,
    );
  });

  await run("el miércoles está cerrado", async () => {
    let offset = 1;
    while (weekdayCR(offset) !== CLOSED_WEEKDAY) {
      offset += 1;
    }

    const slots = await getSlots(isoDateCR(offset));
    assert(slots.length === 0, "el miércoles devolvió espacios");
  });

  // --- Reserva --------------------------------------------------------------
  const bookingDate = workingDate(4);
  const bookingSlots = await getSlots(bookingDate);

  if (bookingSlots.length < 3) {
    throw new Error(
      `no hay suficientes espacios para probar en ${bookingDate}`,
    );
  }

  const target = bookingSlots[2];
  let targetToken = null;

  await run("una reserva válida se crea y ocupa el espacio", async () => {
    const response = await book(target.slot_start, {
      name: "  Prueba QA  ",
      phone: "8767 7997",
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const row = response.data?.[0];
    assert(Boolean(row?.appointment_id), "sin appointment_id");
    assert(Boolean(row?.cancel_token), "sin cancel_token");

    targetToken = row.cancel_token;
    bookedTokens.push(row.cancel_token);

    const slotsAfter = await getSlots(bookingDate);
    const stillFree = slotsAfter.some(
      (slot) => slot.slot_start === target.slot_start,
    );
    assert(!stillFree, "el espacio sigue apareciendo como disponible");
  });

  await run("el mismo espacio no se puede reservar dos veces", async () => {
    const response = await book(target.slot_start, { phone: "87112233" });
    expectError(response, "SLOT_TAKEN");
  });

  await run(
    "dos reservas simultáneas del mismo espacio: solo una gana",
    async () => {
      const concurrentDate = workingDate(6);
      const slots = await getSlots(concurrentDate);
      assert(slots.length > 0, `sin espacios en ${concurrentDate}`);

      const slot = slots[1];
      const [first, second] = await Promise.all([
        book(slot.slot_start, { name: "Carrera A", phone: "88001111" }),
        book(slot.slot_start, { name: "Carrera B", phone: "88002222" }),
      ]);

      const successes = [first, second].filter((result) => !result.error);
      const failures = [first, second].filter((result) => result.error);

      for (const success of successes) {
        bookedTokens.push(success.data[0].cancel_token);
      }

      assert(successes.length === 1, `ganaron ${successes.length} reservas`);
      assert(failures.length === 1, `fallaron ${failures.length} reservas`);
      expectError(failures[0], "SLOT_TAKEN");
    },
  );

  // --- Reglas de negocio ----------------------------------------------------
  await run("no se puede reservar dentro del descanso (12:00)", async () => {
    const response = await book(`${workingDate(5)}T12:00:00-06:00`);
    expectError(response, "SLOT_OUTSIDE_WORKING_HOURS");
  });

  await run(
    "no se puede reservar con menos de 1 hora de antelación",
    async () => {
      const soon = new Date(Date.now() + 30 * 60_000).toISOString();
      const response = await book(soon);
      expectError(response, "SLOT_TOO_SOON");
    },
  );

  await run("no se puede reservar a más de 30 días", async () => {
    const response = await book(`${isoDateCR(31)}T10:00:00-06:00`);
    expectError(response, "SLOT_TOO_FAR");
  });

  await run("no se puede reservar el miércoles", async () => {
    let offset = 1;
    while (weekdayCR(offset) !== CLOSED_WEEKDAY) {
      offset += 1;
    }

    const response = await book(`${isoDateCR(offset)}T10:00:00-06:00`);
    expectError(response, "SLOT_OUTSIDE_WORKING_HOURS");
  });

  await run("un teléfono inválido se rechaza", async () => {
    const slots = await getSlots(workingDate(7));
    assert(slots.length > 0, "sin espacios para probar el teléfono");

    const response = await book(slots[0].slot_start, { phone: "123" });
    expectError(response, "INVALID_PHONE");
  });

  await run("un nombre vacío se rechaza", async () => {
    const slots = await getSlots(workingDate(7));
    assert(slots.length > 0, "sin espacios para probar el nombre");

    const response = await book(slots[0].slot_start, { name: "  " });
    expectError(response, "INVALID_NAME");
  });

  // --- Cancelación ----------------------------------------------------------
  await run("cancelar con el token libera el espacio", async () => {
    assert(Boolean(targetToken), "no hay token de la reserva previa");

    const cancelled = await cancel(targetToken);
    if (cancelled.error) {
      throw new Error(cancelled.error.message);
    }

    const slotsAfter = await getSlots(bookingDate);
    const freeAgain = slotsAfter.some(
      (slot) => slot.slot_start === target.slot_start,
    );
    assert(freeAgain, "el espacio no volvió a estar disponible");
  });

  await run("un token desconocido no cancela nada", async () => {
    const response = await cancel("11111111-1111-4111-8111-111111111111");
    expectError(response, "APPOINTMENT_NOT_FOUND");
  });

  // --- Limpieza -------------------------------------------------------------
  for (const token of bookedTokens) {
    await cancel(token);
  }
}

main()
  .catch((error) => {
    console.error(`\nError inesperado: ${error.message}`);
    if (String(error.message).includes("does not exist")) {
      console.error(
        "\nParece que la migración no está aplicada. Ejecuta supabase/migrations/20261115000000_fase_1_1.sql en el SQL Editor.",
      );
    }
    process.exitCode = 1;
  })
  .finally(() => {
    const failed = results.filter((result) => !result.ok);
    console.log(
      `\n${results.length - failed.length}/${results.length} verificaciones en verde\n`,
    );
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  });
