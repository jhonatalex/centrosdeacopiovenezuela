import type { Metadata, Viewport } from "next";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import DemoBanner from "@/components/DemoBanner";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Centros de Acopio · Ayuda en Emergencias Venezuela",
    template: "%s | Centros de Acopio Venezuela",
  },
  description:
    "Plataforma comunitaria para ubicar y registrar centros de acopio, puntos de ayuda, personal de rescate, atención médica y prevención sísmica en Venezuela.",
  applicationName: "Centros de Acopio Venezuela",
  authors: [{ name: "Centros de Acopio Venezuela" }],
  keywords: [
    "centros de acopio",
    "ayuda humanitaria",
    "emergencias venezuela",
    "donaciones",
    "puntos de ayuda",
    "tratamientos medicos",
    "personal de rescate",
    "prevencion sismica",
    "venezuela",
    "apoyo comunitario",
  ],
  creator: "Centros de Acopio Venezuela",
  publisher: "Centros de Acopio Venezuela",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://centrosdeacopio.ve"),
  openGraph: {
    type: "website",
    locale: "es_VE",
    url: "/",
    title: "Centros de Acopio · Ayuda en Emergencias Venezuela",
    description:
      "Plataforma comunitaria para ubicar y registrar centros de acopio, puntos de ayuda, personal de rescate, atención médica y prevención sísmica en Venezuela.",
    siteName: "Centros de Acopio Venezuela",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 1024,
        alt: "Centros de Acopio Venezuela",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Centros de Acopio · Ayuda en Emergencias Venezuela",
    description:
      "Plataforma comunitaria para ubicar y registrar centros de acopio, puntos de ayuda, personal de rescate, atención médica y prevención sísmica en Venezuela.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d8f86",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${nunito.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="flex h-dvh flex-col overflow-hidden bg-background">
        <AuthProvider>
          <TopBar />
          <DemoBanner />
          <main className="relative mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col overflow-y-auto">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
