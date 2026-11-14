import { afterEach, describe, expect, it } from "vitest";

import { BUSINESS_TIMEZONE, getSupabaseEnv } from "@/lib/env";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_KEY;
});

describe("getSupabaseEnv", () => {
  it("devuelve null cuando faltan las variables", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(getSupabaseEnv()).toBeNull();
  });

  it("devuelve null si alguna variable está vacía o solo tiene espacios", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "   ";

    expect(getSupabaseEnv()).toBeNull();
  });

  it("devuelve las credenciales recortadas cuando están completas", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://demo.supabase.co ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = " anon-key ";

    expect(getSupabaseEnv()).toEqual({
      url: "https://demo.supabase.co",
      anonKey: "anon-key",
    });
  });
});

describe("BUSINESS_TIMEZONE", () => {
  it("usa la zona horaria de Costa Rica", () => {
    expect(BUSINESS_TIMEZONE).toBe("America/Costa_Rica");
  });
});
