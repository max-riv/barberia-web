import { describe, expect, it } from "vitest";

import {
  parseAdminBusinessSettings,
  parseUpdatedBusinessSettings,
  parseUpdatedServicePrice,
  type AdminBusinessSettings,
} from "@/lib/settings";

const businessSettings: AdminBusinessSettings = {
  businessId: "00000000-0000-4000-8000-0000000000c1",
  name: "Charlie's Barbershop",
  whatsappPhone: "+50687677997",
  address: "San José, Costa Rica",
};

describe("parseAdminBusinessSettings", () => {
  it("acepta la fila de un select directo con columna id", () => {
    expect(
      parseAdminBusinessSettings({
        id: "00000000-0000-4000-8000-0000000000c1",
        name: "Charlie's Barbershop",
        whatsapp_phone: "+50687677997",
        address: "San José, Costa Rica",
      }),
    ).toEqual(businessSettings);
  });

  it("tolera el data de un select sin .single()", () => {
    expect(
      parseAdminBusinessSettings([
        {
          id: "00000000-0000-4000-8000-0000000000c1",
          name: "Charlie's Barbershop",
          whatsapp_phone: "+50687677997",
          address: "San José, Costa Rica",
        },
      ]),
    ).toEqual(businessSettings);
  });

  it("tolera la dirección null", () => {
    expect(
      parseAdminBusinessSettings({
        id: "00000000-0000-4000-8000-0000000000c1",
        name: "Charlie's Barbershop",
        whatsapp_phone: "+50687677997",
        address: null,
      }),
    ).toEqual({ ...businessSettings, address: null });
  });

  it("devuelve null si la fila no tiene la forma esperada", () => {
    expect(parseAdminBusinessSettings(null)).toBeNull();
    expect(parseAdminBusinessSettings("basura")).toBeNull();
    expect(parseAdminBusinessSettings([])).toBeNull();
    expect(parseAdminBusinessSettings({})).toBeNull();
    expect(
      parseAdminBusinessSettings({
        name: "Charlie's Barbershop",
        whatsapp_phone: "+50687677997",
        address: null,
      }),
    ).toBeNull();
    expect(
      parseAdminBusinessSettings({
        id: "x",
        name: "Charlie's Barbershop",
        whatsapp_phone: "+50687677997",
        address: null,
      }),
    ).toEqual({ ...businessSettings, businessId: "x", address: null });
    expect(
      parseAdminBusinessSettings({
        id: "00000000-0000-4000-8000-0000000000c1",
        name: 7,
        whatsapp_phone: "+50687677997",
        address: null,
      }),
    ).toBeNull();
    expect(
      parseAdminBusinessSettings({
        id: "00000000-0000-4000-8000-0000000000c1",
        name: "Charlie's Barbershop",
        whatsapp_phone: null,
        address: null,
      }),
    ).toBeNull();
    expect(
      parseAdminBusinessSettings({
        id: "00000000-0000-4000-8000-0000000000c1",
        name: "Charlie's Barbershop",
        whatsapp_phone: "+50687677997",
        address: 42,
      }),
    ).toBeNull();
  });
});

describe("parseUpdatedBusinessSettings", () => {
  it("acepta la fila de la RPC con columna business_id", () => {
    expect(
      parseUpdatedBusinessSettings([
        {
          business_id: "00000000-0000-4000-8000-0000000000c1",
          name: "Charlie's Barbershop",
          whatsapp_phone: "+50687677997",
          address: "San José, Costa Rica",
        },
      ]),
    ).toEqual(businessSettings);
  });

  it("no acepta la columna id del select directo", () => {
    expect(
      parseUpdatedBusinessSettings([
        {
          id: "00000000-0000-4000-8000-0000000000c1",
          name: "Charlie's Barbershop",
          whatsapp_phone: "+50687677997",
          address: null,
        },
      ]),
    ).toBeNull();
  });

  it("solo acepta el arreglo que devuelve la RPC", () => {
    // Un objeto suelto (sin envolver en arreglo) no tiene la forma de la
    // respuesta de una función que retorna `table`.
    expect(
      parseUpdatedBusinessSettings({
        business_id: "00000000-0000-4000-8000-0000000000c1",
        name: "Charlie's Barbershop",
        whatsapp_phone: "+50687677997",
        address: null,
      }),
    ).toBeNull();
  });

  it("devuelve null si la respuesta no tiene la forma esperada", () => {
    expect(parseUpdatedBusinessSettings(null)).toBeNull();
    expect(parseUpdatedBusinessSettings([])).toBeNull();
    expect(parseUpdatedBusinessSettings([null])).toBeNull();
    expect(parseUpdatedBusinessSettings([{}])).toBeNull();
  });
});

describe("parseUpdatedServicePrice", () => {
  it("acepta la fila de la RPC", () => {
    expect(
      parseUpdatedServicePrice([
        {
          service_id: "00000000-0000-4000-8000-0000000000d1",
          name: "Corte de pelo",
          price_cents: 600000,
        },
      ]),
    ).toEqual({
      serviceId: "00000000-0000-4000-8000-0000000000d1",
      name: "Corte de pelo",
      priceCents: 600000,
    });
  });

  it("devuelve null si la respuesta no tiene la forma esperada", () => {
    expect(parseUpdatedServicePrice(null)).toBeNull();
    expect(parseUpdatedServicePrice([])).toBeNull();
    expect(parseUpdatedServicePrice(["basura"])).toBeNull();
    expect(parseUpdatedServicePrice([{}])).toBeNull();
    expect(
      parseUpdatedServicePrice([
        {
          service_id: "00000000-0000-4000-8000-0000000000d1",
          name: "Corte de pelo",
          price_cents: "600000",
        },
      ]),
    ).toBeNull();
    expect(
      parseUpdatedServicePrice([
        {
          service_id: null,
          name: "Corte de pelo",
          price_cents: 600000,
        },
      ]),
    ).toBeNull();
    expect(
      parseUpdatedServicePrice([
        {
          service_id: "00000000-0000-4000-8000-0000000000d1",
          name: "Corte de pelo",
          price_cents: Number.POSITIVE_INFINITY,
        },
      ]),
    ).toBeNull();
  });
});
