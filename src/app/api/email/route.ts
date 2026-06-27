/**
 * API Route: POST /api/email
 *
 * Body JSON:
 *   {
 *     plantilla: "centro_aprobado" | "centro_rechazado",
 *     datos: { to, centroNombre, centroId, ... }
 *   }
 *
 * Solo puede ser llamada desde el servidor (admin page → Server Action o fetch interno).
 * La API key de Resend nunca sale al cliente.
 */

import { NextRequest, NextResponse } from "next/server";
import { enviarEmail, type EmailTemplate, type EmailData } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plantilla, datos } = body as {
      plantilla: EmailTemplate;
      datos: EmailData;
    };

    if (!plantilla || !datos?.to) {
      return NextResponse.json(
        { ok: false, error: "Faltan campos: plantilla y datos.to son requeridos" },
        { status: 400 }
      );
    }

    const resultado = await enviarEmail(plantilla, datos);

    return NextResponse.json(resultado, {
      status: resultado.ok ? 200 : 500,
    });
  } catch (err) {
    console.error("[api/email] Error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
