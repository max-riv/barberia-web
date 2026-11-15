import { describe, expect, it } from "vitest";

import {
  addDays,
  bookingHref,
  buildDateOptions,
  describeSchedule,
  formatLongDate,
  formatPhoneForDisplay,
  formatPrice,
  formatSlotRange,
  formatSlotTime,
  groupSlots,
  isIsoDate,
  localDateOf,
  normalizeCostaRicaPhone,
  normalizeCustomerName,
  parseBookedAppointment,
  parseSlots,
  slotFromStart,
  todayInBusinessTimezone,
  weekdayOf,
} from "@/lib/booking";

describe("fechas en Costa Rica", () => {
  it("calcula el día del negocio, no el de UTC", () => {
    expect(todayInBusinessTimezone(new Date("2026-11-15T03:30:00Z"))).toBe(
      "2026-11-14",
    );
    expect(todayInBusinessTimezone(new Date("2026-11-15T06:30:00Z"))).toBe(
      "2026-11-15",
    );
  });

  it("obtiene la fecha local de un instante", () => {
    expect(localDateOf("2026-11-19T02:00:00Z")).toBe("2026-11-18");
  });

  it("valida el formato y las fechas imposibles", () => {
    expect(isIsoDate("2026-11-19")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("2026-1-1")).toBe(false);
    expect(isIsoDate("mañana")).toBe(false);
  });

  it("suma días cruzando mes y año", () => {
    expect(addDays("2026-11-29", 3)).toBe("2026-12-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("conoce el día de la semana", () => {
    expect(weekdayOf("2026-11-15")).toBe(0); // domingo
    expect(weekdayOf("2026-11-19")).toBe(4); // jueves
  });
});

describe("buildDateOptions", () => {
  const options = buildDateOptions({
    today: "2026-11-15", // domingo
    openWeekdays: [0, 1, 2, 4, 5, 6], // miércoles cerrado
    windowDays: 7,
  });

  it("omite los días cerrados y respeta la ventana", () => {
    const dates = options.map((option) => option.date);

    expect(dates).toEqual([
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
    expect(dates).not.toContain("2026-11-18");
  });

  it("marca hoy y etiqueta día y mes", () => {
    expect(options[0]).toMatchObject({
      date: "2026-11-15",
      day: "15",
      isToday: true,
    });
    expect(options[0]?.weekday.toLowerCase()).toContain("dom");
    expect(options[3]?.month.toLowerCase()).toContain("nov");
  });
});

describe("horas", () => {
  it("convierte UTC a la hora local del negocio", () => {
    expect(formatSlotTime("2026-11-19T14:30:00+00:00")).toBe("08:30");
    expect(formatSlotTime("2026-11-20T00:00:00+00:00")).toBe("18:00");
  });

  it("formatea el rango completo", () => {
    expect(
      formatSlotRange({
        start: "2026-11-19T14:30:00+00:00",
        end: "2026-11-19T15:00:00+00:00",
      }),
    ).toBe("08:30 a 09:00");
  });

  it("separa mañana y tarde", () => {
    const { morning, afternoon } = groupSlots([
      { start: "2026-11-19T14:00:00+00:00", end: "2026-11-19T14:30:00+00:00" },
      { start: "2026-11-19T17:30:00+00:00", end: "2026-11-19T18:00:00+00:00" },
      { start: "2026-11-19T19:00:00+00:00", end: "2026-11-19T19:30:00+00:00" },
    ]);

    expect(morning).toHaveLength(2);
    expect(afternoon).toHaveLength(1);
  });

  it("escribe la fecha larga en español", () => {
    const label = formatLongDate("2026-11-19");

    expect(label).toContain("jueves");
    expect(label).toContain("19");
    expect(label).toContain("noviembre");
  });
});

describe("enlaces de reserva", () => {
  it("codifica la fecha y la hora", () => {
    expect(bookingHref("2026-11-19")).toBe("/reservar?fecha=2026-11-19");
    expect(bookingHref("2026-11-19", "2026-11-19T14:00:00+00:00")).toBe(
      "/reservar?fecha=2026-11-19&hora=2026-11-19T14%3A00%3A00%2B00%3A00",
    );
  });

  it("reconstruye el espacio desde el instante de inicio", () => {
    expect(slotFromStart("2026-11-19T14:00:00+00:00")).toEqual({
      start: "2026-11-19T14:00:00.000Z",
      end: "2026-11-19T14:30:00.000Z",
    });
  });

  it("descarta horas vacías o inválidas", () => {
    expect(slotFromStart(undefined)).toBeNull();
    expect(slotFromStart("")).toBeNull();
    expect(slotFromStart("no-es-fecha")).toBeNull();
  });
});

describe("horario del negocio", () => {
  it("resume días y tramos", () => {
    const summary = describeSchedule([
      { weekday: 0, startTime: "08:00:00", endTime: "12:00:00" },
      { weekday: 0, startTime: "13:00:00", endTime: "18:00:00" },
      { weekday: 1, startTime: "08:00:00", endTime: "12:00:00" },
      { weekday: 1, startTime: "13:00:00", endTime: "18:00:00" },
    ]);

    expect(summary.days).toBe("lunes y domingo");
    expect(summary.hours).toBe("08:00 a 12:00 y 13:00 a 18:00");
  });

  it("avisa cuando no hay horario", () => {
    expect(describeSchedule([])).toEqual({
      days: "Horario por confirmar",
      hours: "",
    });
  });
});

describe("datos del cliente", () => {
  it("normaliza teléfonos de Costa Rica a E.164", () => {
    expect(normalizeCostaRicaPhone("8767 7997")).toBe("+50687677997");
    expect(normalizeCostaRicaPhone("50687677997")).toBe("+50687677997");
    expect(normalizeCostaRicaPhone("+506-8767-7997")).toBe("+50687677997");
    expect(normalizeCostaRicaPhone("+1 305 555 0100")).toBe("+13055550100");
  });

  it("rechaza teléfonos que no sirven", () => {
    expect(normalizeCostaRicaPhone("123")).toBeNull();
    expect(normalizeCostaRicaPhone("")).toBeNull();
    expect(normalizeCostaRicaPhone(null)).toBeNull();
    expect(normalizeCostaRicaPhone("1234567890123456789")).toBeNull();
  });

  it("muestra el teléfono agrupado", () => {
    expect(formatPhoneForDisplay("+50687677997")).toBe("+506 8767 7997");
    expect(formatPhoneForDisplay("+13055550100")).toBe("+13055550100");
  });

  it("limpia el nombre y descarta los inválidos", () => {
    expect(normalizeCustomerName("  Ana   María  ")).toBe("Ana María");
    expect(normalizeCustomerName("A")).toBeNull();
    expect(normalizeCustomerName("   ")).toBeNull();
    expect(normalizeCustomerName("Ana\u0000")).toBeNull();
    expect(normalizeCustomerName("x".repeat(81))).toBeNull();
  });
});

describe("precios", () => {
  it("formatea colones sin decimales", () => {
    expect(formatPrice(600000)).toBe("₡6.000");
    expect(formatPrice(1250000)).toBe("₡12.500");
    expect(formatPrice(0)).toBe("₡0");
  });
});

describe("respuestas de Supabase", () => {
  it("descarta filas inválidas y ordena los espacios", () => {
    const slots = parseSlots([
      {
        slot_start: "2026-11-19T16:00:00+00:00",
        slot_end: "2026-11-19T16:30:00+00:00",
      },
      {
        slot_start: "2026-11-19T14:00:00+00:00",
        slot_end: "2026-11-19T14:30:00+00:00",
      },
      { slot_start: "no-es-fecha", slot_end: "2026-11-19T14:30:00+00:00" },
      "basura",
      null,
    ]);

    expect(slots.map((slot) => slot.start)).toEqual([
      "2026-11-19T14:00:00+00:00",
      "2026-11-19T16:00:00+00:00",
    ]);
  });

  it("devuelve una lista vacía si la respuesta no es un arreglo", () => {
    expect(parseSlots(null)).toEqual([]);
    expect(parseSlots({ slot_start: "2026-11-19T14:00:00+00:00" })).toEqual([]);
  });

  it("valida la cita devuelta por la RPC", () => {
    expect(
      parseBookedAppointment([
        {
          appointment_id: "00000000-0000-4000-8000-0000000000aa",
          cancel_token: "00000000-0000-4000-8000-0000000000bb",
          starts_at: "2026-11-19T14:00:00+00:00",
          ends_at: "2026-11-19T14:30:00+00:00",
        },
      ]),
    ).toEqual({
      id: "00000000-0000-4000-8000-0000000000aa",
      token: "00000000-0000-4000-8000-0000000000bb",
      startsAt: "2026-11-19T14:00:00+00:00",
      endsAt: "2026-11-19T14:30:00+00:00",
    });

    expect(parseBookedAppointment([])).toBeNull();
    expect(parseBookedAppointment([{ appointment_id: "x" }])).toBeNull();
  });
});
