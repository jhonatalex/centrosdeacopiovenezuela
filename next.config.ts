import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin `output: "export"`: Firebase App Hosting hace un build de servidor
  // (SSR + API routes como /api/resolve-map). El adaptador de App Hosting
  // aplica sus propias optimizaciones de salida.
  images: { unoptimized: true },
};

export default nextConfig;
