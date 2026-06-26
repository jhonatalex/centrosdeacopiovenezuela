import type { Metadata, Viewport } from "next";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import DemoBanner from "@/components/DemoBanner";
import Footer from "@/components/Footer";

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
  title: "Centros de Acopio · Ayuda en emergencias",
  description:
    "Plataforma comunitaria para ubicar y registrar centros de acopio, tratamientos médicos, rescate y prevención sísmica en Venezuela.",
  applicationName: "Centros de Acopio",
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
            <Footer />
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
