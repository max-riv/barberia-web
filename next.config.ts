import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
