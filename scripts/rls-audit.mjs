#!/usr/bin/env node
/**
 * Auditoría de RLS y GRANT de la Fase 1.6 contra el proyecto real de Supabase.
 *
 * Comprueba exhaustivamente, usando únicamente la clave pública (anon), qué
 * tablas puede leer/escribir el público y qué funciones RPC puede ejecutar.
 * No crea, actualiza ni borra datos reales: todas las escrituras deben ser
 * rechazadas y se construyen para no mutar datos incluso si hubiera un fallo
 * de permisos. Los conteos de las tablas legibles se comparan antes y después.
 *
 * Uso:
 *   npm run audit:rls
 *
 * Salida: imprime el reporte Markdown y lo guarda en docs/qa/rls-audit.md.
 * Termina con código 0 solo si todas las comprobaciones están en verde.
 */

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { format as formatMarkdown } from "prettier";

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
// Datos del seed y constantes de la auditoría
// ---------------------------------------------------------------------------

const BUSINESS_ID = "00000000-0000-4000-8000-000000000001";
const BARBER_ID = "00000000-0000-4000-8000-000000000002";
const SERVICE_ID = "00000000-0000-4000-8000-000000000003";
const MISSING_ID = "11111111-1111-4111-8111-111111111111";
const REPORT_PATH = "docs/qa/rls-audit.md";
const CR_OFFSET_MS = 6 * 60 * 60 * 1000; // America/Costa_Rica = UTC-6

const READABLE_TABLES = ["businesses", "barbers", "services", "working_hours"];

const TABLE_SELECTS = {
  businesses: "id, name, slug, timezone",
  barbers: "id, business_id, display_name, active",
  services: "id, business_id, name, active",
  working_hours: "id, barber_id, weekday, start_time, end_time",
};

// Los INSERT incluyen NOT NULL violados y UPDATE/DELETE apuntan a un UUID
// inexistente. Así, una concesión incorrecta queda detectada sin llegar a
// insertar una fila ni a modificar/borrar una fila real.
const TABLE_WRITES = {
  businesses: {
    insert: {
      id: randomUUID(),
      name: null,
      slug: null,
      whatsapp_phone: null,
    },
    update: { name: null },
  },
  barbers: {
    insert: {
      id: randomUUID(),
      business_id: BUSINESS_ID,
      display_name: null,
    },
    update: { display_name: null },
  },
  services: {
    insert: {
      id: randomUUID(),
      business_id: BUSINESS_ID,
      name: null,
    },
    update: { name: null },
  },
  working_hours: {
    insert: {
      id: randomUUID(),
      barber_id: BARBER_ID,
      weekday: null,
      start_time: null,
      end_time: null,
    },
    update: { weekday: null },
  },
  time_off: {
    insert: {
      id: randomUUID(),
      barber_id: BARBER_ID,
      starts_at: null,
      ends_at: null,
    },
    update: { starts_at: null },
  },
  appointments: {
    insert: {
      id: randomUUID(),
      business_id: BUSINESS_ID,
      barber_id: BARBER_ID,
      service_id: SERVICE_ID,
      customer_name: null,
      customer_phone: null,
      starts_at: null,
      ends_at: null,
    },
    update: { customer_name: null },
  },
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function isoDateCR(offsetDays) {
  return new Date(Date.now() - CR_OFFSET_MS + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function errorDetail(error, status) {
  if (!error) {
    return "sin error";
  }

  const code = error.code ? ` [${error.code}]` : "";
  const httpStatus = status ? ` HTTP ${status}` : "";
  return `${error.message}${code}${httpStatus}`;
}

function isPermissionDenied(error) {
  if (!error) {
    return false;
  }

  const text = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(" ");

  return (
    error.code === "42501" ||
    /permission denied|insufficient privilege|row[- ]level security/i.test(text)
  );
}

function expectPermissionDenied(result, operation) {
  assert(result.error, `${operation}: la operación fue aceptada por anon`);
  assert(
    isPermissionDenied(result.error),
    `${operation}: se esperaba un error de permiso/RLS y se recibió ${errorDetail(result.error, result.status)}`,
  );

  return `Denegado por permiso/RLS: ${errorDetail(result.error, result.status)}`;
}

function expectBusinessError(result, expectedCode, operation) {
  assert(result.error, `${operation}: la llamada fue aceptada`);
  assert(
    !isPermissionDenied(result.error),
    `${operation}: anon no tiene EXECUTE: ${errorDetail(result.error, result.status)}`,
  );

  const message = String(result.error.message);
  assert(
    message.includes(expectedCode),
    `${operation}: se esperaba ${expectedCode} y se recibió ${errorDetail(result.error, result.status)}`,
  );

  return `Ejecutable; error de negocio ${expectedCode}: ${errorDetail(result.error, result.status)}`;
}

async function captureCounts() {
  const counts = {};

  for (const table of READABLE_TABLES) {
    const { count, error, status } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });

    if (error) {
      throw new Error(
        `No se pudo contar ${table}: ${errorDetail(error, status)}`,
      );
    }

    assert(
      Number.isInteger(count),
      `PostgREST no devolvió un conteo entero para ${table}`,
    );
    counts[table] = count;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Runner y reporte Markdown
// ---------------------------------------------------------------------------

const sections = [];

function section(name) {
  let existing = sections.find((candidate) => candidate.name === name);
  if (!existing) {
    existing = { name, checks: [] };
    sections.push(existing);
  }
  return existing;
}

async function runCheck(sectionName, operation, expected, fn) {
  const target = section(sectionName);

  try {
    const result = await fn();
    target.checks.push({ operation, expected, result, ok: true });
  } catch (error) {
    target.checks.push({
      operation,
      expected,
      result: error instanceof Error ? error.message : String(error),
      ok: false,
    });
  }
}

function markdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function buildReport() {
  const checks = sections.flatMap((item) => item.checks);
  const passed = checks.filter((check) => check.ok).length;
  const failed = checks.filter((check) => !check.ok);
  const lines = [
    "# Auditoría de RLS con clave pública",
    "",
    `Fecha: ${new Date(Date.now()).toISOString()} (UTC).`,
    "",
    "Auditoría ejecutada exclusivamente con `NEXT_PUBLIC_SUPABASE_ANON_KEY` y el rol `anon`; no se utilizó `service_role`.",
    "",
    "Las escrituras son intentos no destructivos que deben fallar. Los INSERT contienen valores `NULL` inválidos y los UPDATE/DELETE apuntan a un UUID inexistente para evitar mutaciones incluso ante una concesión incorrecta.",
    "",
  ];

  for (const item of sections) {
    lines.push(
      `## ${item.name}`,
      "",
      "| Operación | Esperado | Resultado | ✓/✗ |",
      "| --- | --- | --- | :---: |",
    );

    for (const check of item.checks) {
      lines.push(
        `| ${markdownCell(check.operation)} | ${markdownCell(check.expected)} | ${markdownCell(check.result)} | ${check.ok ? "✓" : "✗"} |`,
      );
    }

    lines.push("");
  }

  lines.push(
    "## Resumen",
    "",
    `**${passed}/${checks.length} comprobaciones en verde.**`,
    "",
  );

  if (failed.length > 0) {
    lines.push("### Fallos detectados", "");
    for (const check of failed) {
      lines.push(
        `- **${markdownCell(check.operation)}**: ${markdownCell(check.result)}`,
      );
    }
    lines.push("");
  } else {
    lines.push(
      "No se detectaron agujeros de RLS/GRANT en las operaciones auditadas.",
      "",
    );
  }

  lines.push(
    "---",
    "",
    "Archivo generado automáticamente por `npm run audit:rls`; no editar manualmente.",
  );

  return { markdown: lines.join("\n"), passed, total: checks.length, failed };
}

// ---------------------------------------------------------------------------
// Auditoría de tablas
// ---------------------------------------------------------------------------

async function auditTables() {
  for (const table of ["businesses", "barbers", "services", "working_hours"]) {
    const sectionName = `Tabla \`${table}\``;

    await runCheck(
      sectionName,
      `SELECT columnas públicas (${TABLE_SELECTS[table]})`,
      "Permitido; devuelve al menos una fila",
      async () => {
        const result = await supabase
          .from(table)
          .select(TABLE_SELECTS[table])
          .limit(1);

        assert(
          !result.error,
          `SELECT falló: ${errorDetail(result.error, result.status)}`,
        );
        assert(Array.isArray(result.data), "La respuesta no es un array");
        assert(result.data.length > 0, "SELECT no devolvió filas");

        return `Permitido; ${result.data.length} fila visible en la muestra`;
      },
    );

    if (table === "barbers") {
      await runCheck(
        sectionName,
        "SELECT auth_user_id",
        "Error de permiso por columna no concedida",
        async () => {
          const result = await supabase
            .from("barbers")
            .select("auth_user_id")
            .limit(1);
          return expectPermissionDenied(result, "barbers SELECT auth_user_id");
        },
      );
    }
  }

  for (const table of ["time_off", "appointments"]) {
    await runCheck(
      `Tabla \`${table}\``,
      "SELECT id",
      "Error de permiso; un array vacío no es válido",
      async () => {
        const result = await supabase.from(table).select("id").limit(1);
        return expectPermissionDenied(result, `${table} SELECT`);
      },
    );
  }

  for (const table of Object.keys(TABLE_WRITES)) {
    const sectionName = `Tabla \`${table}\``;
    const writes = TABLE_WRITES[table];

    await runCheck(
      sectionName,
      "INSERT",
      "Error de permiso/RLS, no de validación",
      async () => {
        const result = await supabase.from(table).insert(writes.insert);
        return expectPermissionDenied(result, `${table} INSERT`);
      },
    );

    await runCheck(
      sectionName,
      "UPDATE",
      "Error de permiso/RLS, no de validación",
      async () => {
        const result = await supabase
          .from(table)
          .update(writes.update)
          .eq("id", MISSING_ID);
        return expectPermissionDenied(result, `${table} UPDATE`);
      },
    );

    await runCheck(sectionName, "DELETE", "Error de permiso/RLS", async () => {
      const result = await supabase.from(table).delete().eq("id", MISSING_ID);
      return expectPermissionDenied(result, `${table} DELETE`);
    });
  }
}

// ---------------------------------------------------------------------------
// Auditoría de funciones RPC
// ---------------------------------------------------------------------------

async function auditPublicRpc() {
  await runCheck(
    "Función `get_available_slots(uuid, date)`",
    "EXECUTE con fecha local de Costa Rica +40 días",
    "Ejecutable; devuelve un array vacío, no error de permiso",
    async () => {
      const result = await supabase.rpc("get_available_slots", {
        p_barber_id: BARBER_ID,
        p_date: isoDateCR(40),
      });

      assert(
        !result.error,
        `No ejecutable: ${errorDetail(result.error, result.status)}`,
      );
      assert(Array.isArray(result.data), "La respuesta no es un array");
      assert(
        result.data.length === 0,
        `Devolvió ${result.data.length} espacios fuera de rango`,
      );

      return "Ejecutable; devolvió [] para una fecha fuera de rango";
    },
  );

  await runCheck(
    "Función `book_appointment(uuid, uuid, timestamptz, text, text)`",
    "EXECUTE con p_starts_at en el pasado",
    "Ejecutable; error de negocio SLOT_TOO_SOON",
    async () => {
      const result = await supabase.rpc("book_appointment", {
        p_barber_id: BARBER_ID,
        p_service_id: SERVICE_ID,
        p_starts_at: new Date(Date.now() - 86_400_000).toISOString(),
        p_customer_name: "Auditoría RLS",
        p_customer_phone: "87677997",
      });

      return expectBusinessError(result, "SLOT_TOO_SOON", "book_appointment");
    },
  );

  await runCheck(
    "Función `cancel_appointment(uuid)`",
    "EXECUTE con token UUID aleatorio",
    "Ejecutable; error de negocio APPOINTMENT_NOT_FOUND",
    async () => {
      const result = await supabase.rpc("cancel_appointment", {
        p_token: randomUUID(),
      });

      return expectBusinessError(
        result,
        "APPOINTMENT_NOT_FOUND",
        "cancel_appointment",
      );
    },
  );
}

async function auditRestrictedRpc() {
  await runCheck(
    "Función `normalize_cr_phone(text)`",
    "EXECUTE",
    "Error de permiso; anon no tiene EXECUTE",
    async () => {
      const result = await supabase.rpc("normalize_cr_phone", {
        p_phone: "87677997",
      });
      return expectPermissionDenied(result, "normalize_cr_phone");
    },
  );

  const adminCalls = [
    [
      "admin_get_agenda(date, date)",
      "admin_get_agenda",
      { p_from: isoDateCR(0), p_to: isoDateCR(7) },
    ],
    [
      "admin_get_appointment(uuid)",
      "admin_get_appointment",
      { p_appointment_id: randomUUID() },
    ],
    ["admin_get_slots(date)", "admin_get_slots", { p_date: isoDateCR(1) }],
    [
      "admin_create_appointment(uuid, timestamptz, text, text)",
      "admin_create_appointment",
      {
        p_service_id: SERVICE_ID,
        p_starts_at: new Date(Date.now() - 86_400_000).toISOString(),
        p_customer_name: "Auditoría RLS",
        p_customer_phone: "87677997",
      },
    ],
    [
      "admin_set_appointment_status(uuid, appointment_status)",
      "admin_set_appointment_status",
      { p_appointment_id: randomUUID(), p_status: "cancelled" },
    ],
    [
      "admin_set_working_hours(smallint, jsonb)",
      "admin_set_working_hours",
      { p_weekday: 1, p_ranges: [{ start: "08:00", end: "12:00" }] },
    ],
    [
      "admin_create_time_off(timestamptz, timestamptz, text, boolean)",
      "admin_create_time_off",
      {
        p_starts_at: `${isoDateCR(40)}T08:00:00-06:00`,
        p_ends_at: `${isoDateCR(40)}T12:00:00-06:00`,
        p_reason: "Auditoría RLS: no debe crearse",
        p_force: false,
      },
    ],
    ["admin_list_time_off()", "admin_list_time_off", undefined],
    [
      "admin_delete_time_off(uuid)",
      "admin_delete_time_off",
      { p_time_off_id: randomUUID() },
    ],
    [
      "admin_update_business_settings(text, text, text)",
      "admin_update_business_settings",
      {
        p_name: "Auditoría RLS: no debe aplicarse",
        p_whatsapp_phone: "87677997",
        p_address: null,
      },
    ],
    [
      "admin_update_service_price(uuid, integer)",
      "admin_update_service_price",
      { p_service_id: SERVICE_ID, p_price_cents: 600000 },
    ],
  ];

  for (const [signature, name, args] of adminCalls) {
    await runCheck(
      `Función \`${signature}\``,
      "EXECUTE",
      "Error de permiso; no error de negocio/autenticación",
      async () => {
        const result = await supabase.rpc(name, args);
        return expectPermissionDenied(result, name);
      },
    );
  }
}

async function auditIntegrity(beforeCounts) {
  const afterCounts = await captureCounts();

  for (const table of READABLE_TABLES) {
    await runCheck(
      `Tabla \`${table}\``,
      "Integridad: conteo antes/después de toda la auditoría",
      `${beforeCounts[table]} filas antes y después`,
      async () => {
        assert(
          beforeCounts[table] === afterCounts[table],
          `El conteo cambió: antes=${beforeCounts[table]}, después=${afterCounts[table]}`,
        );
        return `Sin cambios: antes=${beforeCounts[table]}, después=${afterCounts[table]}`;
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Programa principal
// ---------------------------------------------------------------------------

async function main() {
  const beforeCounts = await captureCounts();

  await auditTables();
  await auditPublicRpc();
  await auditRestrictedRpc();
  await auditIntegrity(beforeCounts);

  const report = buildReport();
  const markdown = await formatMarkdown(report.markdown, {
    parser: "markdown",
  });
  mkdirSync("docs/qa", { recursive: true });
  writeFileSync(REPORT_PATH, markdown, "utf8");
  console.log(markdown.trimEnd());

  if (report.failed.length > 0) {
    console.error(
      `\nAuditoría FALLIDA: ${report.passed}/${report.total} comprobaciones en verde. Revisa ${REPORT_PATH}.`,
    );
    process.exit(1);
  }

  console.error(
    `\nAuditoría en verde: ${report.passed}/${report.total}. Reporte: ${REPORT_PATH}.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(
    `\nError inesperado durante la auditoría: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
