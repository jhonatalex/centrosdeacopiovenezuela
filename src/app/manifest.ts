import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Centros de Acopio · Ayuda en Emergencias Venezuela",
    short_name: "Centros de Acopio",
    description:
      "Plataforma comunitaria para ubicar y registrar centros de acopio, tratamientos médicos, rescate y prevención sísmica en Venezuela.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d8f86",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
