import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Barbería · Reserva tu cita",
    template: "%s · Barbería",
  },
  description:
    "Reserva tu corte en línea en bloques de 30 minutos, sin crear cuenta y sin llamadas.",
  applicationName: "Barbería",
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14110e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
