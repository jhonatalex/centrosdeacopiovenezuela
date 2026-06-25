import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Falta la URL" }, { status: 400 });
  }

  try {
    // Hacemos una petición de tipo HEAD o GET para seguir los redireccionamientos
    // de Google Maps y obtener la URL final resuelta.
    const res = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    return NextResponse.json({ resolvedUrl: res.url });
  } catch (error: any) {
    console.error("Error resolving Google Maps URL:", error);
    return NextResponse.json(
      { error: "No se pudo resolver la URL de Google Maps" },
      { status: 500 }
    );
  }
}
