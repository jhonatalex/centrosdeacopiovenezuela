import { NextResponse } from "next/server";
import { validarApiKey } from "@/lib/db";
import { getFirebase, firebaseHabilitado } from "@/lib/firebase";

// Este endpoint requiere servidor (Firebase App Hosting / Cloud Run).
// NO funciona en export estático.
export const dynamic = "force-dynamic";

/**
 * GET /api/hospitalizados
 *
 * Headers requeridos:
 *   x-api-key: <tu_api_key>
 *
 * O bien query param:
 *   ?apikey=<tu_api_key>
 *
 * Query params opcionales:
 *   limit  — máximo de registros a devolver (default 100, max 500)
 *   offset — registros a saltar (para paginación)
 *
 * Respuesta:
 * {
 *   ok: true,
 *   generado_at: "<ISO timestamp>",
 *   total: <n>,
 *   limit: <n>,
 *   offset: <n>,
 *   hospitalizados: [ { id, nombre, edad, cedula, genero, hospital, area,
 *                        estadoSalud, ciudad, telefono, condicionesMedicas,
 *                        creadoEn, fichaUrl } ]
 * }
 */
export async function GET(request: Request) {
  // ── 1. Extraer token ──────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const token =
    request.headers.get("x-api-key") ??
    searchParams.get("apikey") ??
    "";

  // ── 2. Validar key ────────────────────────────────────────────────
  if (!firebaseHabilitado) {
    return NextResponse.json(
      { ok: false, error: "El servidor está en modo demo. Configura Firebase para usar la API." },
      { status: 503 }
    );
  }

  const key = await validarApiKey(token);
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "API key inválida o revocada." },
      { status: 401 }
    );
  }

  // ── 3. Obtener parámetros de paginación ───────────────────────────
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  // ── 4. Consultar Firestore directamente (servidor) ────────────────
  const { db } = getFirebase();
  const { collection, getDocs, query, where, orderBy, limit: fsLimit } = await import("firebase/firestore");

  // Traemos los hospitalizados. Firestore no soporta offset nativo,
  // así que traemos limit+offset y sliceamos en memoria.
  const q = query(
    collection(db!, "medicos"),
    where("hospitalizado", "==", true),
    orderBy("creadoEn", "desc"),
    fsLimit(offset + limit)
  );

  const snap = await getDocs(q);
  const todos = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Record<string, unknown>[];
  const pagina = todos.slice(offset);

  // ── 5. Proyectar solo campos públicos ─────────────────────────────
  const hospitalizados = pagina.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    edad: p.edad,
    cedula: p.cedula,
    genero: p.genero,
    hospital: p.hospital,
    area: p.area,
    estadoSalud: p.estadoSalud,
    ciudad: p.ciudad,
    municipio: p.municipio,
    telefono: p.telefono,
    condicionesMedicas: p.condicionesMedicas,
    foto: p.foto,
    fichaUrl: p.fichaUrl,
    creadoEn: p.creadoEn,
  }));

  // ── 6. Respuesta ──────────────────────────────────────────────────
  return NextResponse.json(
    {
      ok: true,
      atribucion: "Centros de Acopio Venezuela — venezolanos ayudando venezolanos",
      generado_at: new Date().toISOString(),
      total: snap.size,
      limit,
      offset,
      hospitalizados,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    }
  );
}

/** Preflight CORS */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "x-api-key, Content-Type",
    },
  });
}
