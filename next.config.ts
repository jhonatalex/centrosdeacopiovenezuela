import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Firebase Hosting sirve archivos estáticos; el SDK de Firebase corre en el cliente.
};

export default nextConfig;
