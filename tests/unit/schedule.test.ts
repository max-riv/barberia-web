import { describe, expect, it } from "vitest";

import {
  WEEKDAY_EDITOR_ORDER,
  formatTimeOffRange,
  parseAdminTimeOffs,
  parseTimeOffConflicts,
  parseTimeOffCreation,
  parseWorkingHours,
} from "@/lib/schedule";

describe("parseWorkingHours", () => {
  it("devuelve siempre los 7 días ordenados de lunes a domingo", () => {
    const days = parseWorkingHours([
      { weekday: 0, start_time: "09:00:00", end_time: "13:00:00" },
      { weekday: 1, start_time: "08:00:00", end_time: "12:00:00" },
    ]);

    expect(days).toHaveLength(7);
    expect(days.map((day) => day.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(WEEKDAY_EDITOR_ORDER).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("acorta las horas al formato HH:MM", () => {
    const days = parseWorkingHours([
      { weekday: 1, start_time: "08:00:00", end_time: "12:30:00" },
    ]);
    const lunes = days.find((day) => day.weekday === 1);

    expect(lunes?.ranges).toEqual([{ start: "08:00", end: "12:30" }]);
  });

  it("deja en ranges: [] los días sin filas", () => {
    const days = parseWorkingHours([
      { weekday: 1, start_time: "08:00:00", end_time: "12:00:00" },
    ]);

    for (const day of days) {
      if (day.weekday !== 1) {
        expect(day.ranges).toEqual([]);
      }
    }

    expect(parseWorkingHours([]).every((day) => day.ranges.length === 0)).toBe(
      true,
    );
  });

  it("ordena los tramos de un día por hora de inicio", () => {
    const days = parseWorkingHours([
      { weekday: 2, start_time: "13:00:00", end_time: "18:00:00" },
      { weekday: 2, start_time: "08:00:00", end_time: "12:00:00" },
    ]);
    const martes = days.find((day) => day.weekday === 2);

    expect(martes?.ranges.map((range) => range.start)).toEqual([
      "08:00",
      "13:00",
    ]);
  });

  it("descarta las filas malformadas", () => {
    const days = parseWorkingHours([
      "basura",
      null,
      {},
      { weekday: 7, start_time: "08:00:00", end_time: "12:00:00" },
      { weekday: -1, start_time: "08:00:00", end_time: "12:00:00" },
      { weekday: 1.5, start_time: "08:00:00", end_time: "12:00:00" },
      { weekday: "1", start_time: "08:00:00", end_time: "12:00:00" },
      { weekday: 1, start_time: 8, end_time: "12:00:00" },
      { weekday: 1, start_time: "08:00:00", end_time: null },
      { weekday: 1, start_time: "8:00", end_time: "12:00" },
      { weekday: 1, start_time: "08:00", end_time: "24:00" },
      { weekday: 1, start_time: "12:00:00", end_time: "08:00:00" },
      { weekday: 1, start_time: "08:00:00", end_time: "08:00:00" },
    ]);

    expect(days.every((day) => day.ranges.length === 0)).toBe(true);
  });

  it("tolera una respuesta que no es un arreglo", () => {
    const days = parseWorkingHours(null);

    expect(days).toHaveLength(7);
    expect(days.every((day) => day.ranges.length === 0)).toBe(true);
  });
});

describe("parseAdminTimeOffs", () => {
  const row = {
    time_off_id: "00000000-0000-4000-8000-0000000000a1",
    starts_at: "2026-11-27T14:00:00Z",
    ends_at: "2026-11-27T18:00:00Z",
    reason: "Diligencias",
    appointment_count: 2,
  };

  it("ordena los bloqueos por startsAt", () => {
    const timeOffs = parseAdminTimeOffs([
      { ...row, time_off_id: "b", starts_at: "2026-11-28T14:00:00Z" },
      { ...row, time_off_id: "a", starts_at: "2026-11-26T14:00:00Z" },
    ]);

    expect(timeOffs.map((timeOff) => timeOff.id)).toEqual(["a", "b"]);
  });

  it("tolera reason null y cuenta las citas del rango", () => {
    const timeOffs = parseAdminTimeOffs([
      { ...row, reason: null, appointment_count: 0 },
    ]);

    expect(timeOffs).toEqual([
      {
        id: "00000000-0000-4000-8000-0000000000a1",
        startsAt: "2026-11-27T14:00:00Z",
        endsAt: "2026-11-27T18:00:00Z",
        reason: null,
        appointmentCount: 0,
      },
    ]);
  });

  it("descarta las filas malformadas", () => {
    expect(
      parseAdminTimeOffs([
        "basura",
        null,
        {},
        { ...row, time_off_id: 42 },
        { ...row, starts_at: "no-es-fecha" },
        { ...row, ends_at: null },
        { ...row, reason: 7 },
        { ...row, appointment_count: "2" },
        { ...row, appointment_count: Number.NaN },
      ]),
    ).toEqual([]);
  });

  it("devuelve una lista vacía si la respuesta no es un arreglo", () => {
    expect(parseAdminTimeOffs(null)).toEqual([]);
    expect(parseAdminTimeOffs({ ...row })).toEqual([]);
  });
});

describe("parseTimeOffConflicts", () => {
  const conflict = {
    starts_at: "2026-11-27T14:00:00Z",
    ends_at: "2026-11-27T14:30:00Z",
    customer_name: "Ana",
    customer_phone: "+50687677997",
  };

  it("valida la estructura de cada conflicto", () => {
    expect(parseTimeOffConflicts([conflict])).toEqual([
      {
        startsAt: "2026-11-27T14:00:00Z",
        endsAt: "2026-11-27T14:30:00Z",
        customerName: "Ana",
        customerPhone: "+50687677997",
      },
    ]);
  });

  it("acepta el jsonb vacío []", () => {
    expect(parseTimeOffConflicts([])).toEqual([]);
  });

  it("descarta entradas malformadas y respuestas que no son arreglos", () => {
    expect(
      parseTimeOffConflicts([
        "basura",
        null,
        {},
        { ...conflict, starts_at: "no-es-fecha" },
        { ...conflict, customer_name: 7 },
        { ...conflict, customer_phone: null },
      ]),
    ).toEqual([]);

    expect(parseTimeOffConflicts(null)).toEqual([]);
    expect(parseTimeOffConflicts("[]")).toEqual([]);
  });
});

describe("parseTimeOffCreation", () => {
  it("acepta una fila creada con el jsonb de conflictos vacío", () => {
    expect(
      parseTimeOffCreation([
        {
          time_off_id: "00000000-0000-4000-8000-0000000000b1",
          created: true,
          conflicts: [],
        },
      ]),
    ).toEqual({
      timeOffId: "00000000-0000-4000-8000-0000000000b1",
      created: true,
      conflicts: [],
    });
  });

  it("acepta una fila con conflictos y created false sin id", () => {
    const creation = parseTimeOffCreation([
      {
        time_off_id: null,
        created: false,
        conflicts: [
          {
            starts_at: "2026-11-27T14:00:00Z",
            ends_at: "2026-11-27T14:30:00Z",
            customer_name: "Ana",
            customer_phone: "+50687677997",
          },
        ],
      },
    ]);

    expect(creation?.created).toBe(false);
    expect(creation?.timeOffId).toBeNull();
    expect(creation?.conflicts).toEqual([
      {
        startsAt: "2026-11-27T14:00:00Z",
        endsAt: "2026-11-27T14:30:00Z",
        customerName: "Ana",
        customerPhone: "+50687677997",
      },
    ]);
  });

  it("devuelve null si la respuesta no tiene la forma esperada", () => {
    expect(parseTimeOffCreation(null)).toBeNull();
    expect(parseTimeOffCreation([])).toBeNull();
    expect(parseTimeOffCreation(["basura"])).toBeNull();
    expect(parseTimeOffCreation([{}])).toBeNull();
    expect(
      parseTimeOffCreation([{ time_off_id: "x", created: "si" }]),
    ).toBeNull();
    expect(
      parseTimeOffCreation([{ time_off_id: null, created: true }]),
    ).toBeNull();
  });
});

describe("formatTimeOffRange", () => {
  it("escribe el rango en fecha y hora de Costa Rica", () => {
    const label = formatTimeOffRange({
      startsAt: "2026-11-26T14:00:00Z",
      endsAt: "2026-11-26T18:30:00Z",
    });

    expect(label).toContain("jueves");
    expect(label).toContain("26");
    expect(label).toContain("noviembre");
    expect(label).toContain("08:00 a 12:30");
  });
});
