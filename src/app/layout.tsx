import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://barberia-web.netlify.app"),
  title: {
    default: "Charlie's Barbershop · Reserva tu cita",
    template: "%s · Charlie's Barbershop",
  },
  description:
    "Reserva tu corte en línea en bloques de 30 minutos, sin crear cuenta y sin llamadas.",
  applicationName: "Charlie's Barbershop",
  formatDetection: { telephone: true },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Charlie's Barbershop",
    description: "Tu corte, sin llamadas ni esperas. Reserva en línea.",
    type: "website",
    locale: "es_CR",
    images: [
      {
        url: "/images/hero-barbero.webp",
        width: 1312,
        height: 1199,
        alt: "Chata trabajando en Charlie's Barbershop",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${barlowCondensed.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
