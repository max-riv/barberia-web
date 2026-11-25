import { defineConfig } from "@playwright/test";

// E2E del flujo público contra el servidor de desarrollo (npm run dev) y la
// base de Supabase de .env.local. Las pruebas crean una cita y la cancelan al
// final, igual que scripts/db-smoke-test.mjs. Es una herramienta LOCAL de
// verificación bajo demanda: no debe programarse en CI contra producción.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
