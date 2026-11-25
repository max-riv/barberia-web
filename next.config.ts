import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite recargar HMR al probar desde la red local (por ejemplo, el móvil).
  allowedDevOrigins: ["192.168.0.18"],
  // Cache Components queda desactivado a propósito: la Fase 1 usa cookies de
  // sesión en /admin y esa combinación exige envolver todo en Suspense.
  // Se puede activar más adelante sin cambiar la arquitectura.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
