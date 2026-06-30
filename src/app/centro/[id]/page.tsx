import { Metadata, ResolvingMetadata } from "next";
import { obtenerCentro } from "@/lib/db";
import CentroClient from "./CentroClient";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { id } = await params;
  const centro = await obtenerCentro(id);

  if (!centro) {
    return { title: "Centro no encontrado" };
  }

  return {
    title: centro.nombre,
    description: `Centro de acopio en ${centro.ciudad}, ${centro.zona || ""}. Necesita: ${centro.necesita.join(", ")}`,
    openGraph: {
      images: centro.fotoUrl ? [centro.fotoUrl] : [],
    },
  };
}

export default async function CentroPage({ params }: Props) {
  const { id } = await params;
  return <CentroClient id={id} />;
}
