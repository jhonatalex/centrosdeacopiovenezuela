// Módulo de integración con la API pública de Venezuela Reporta.
// https://venezuelareporta.org/api/v1/personas

import type { RegistroMedico } from "./types";

const API_BASE = "https://venezuelareporta.org/api/v1/personas";

/** Estructura de la respuesta de la API Venezuela Reporta */
export interface PersonaVR {
  id: string;
  status: string;
  nombre: string;
  cedula?: string;
  genero?: string;
  edad?: number;
  ciudad?: string;
  zona?: string;
  ultima_vez?: string;
  descripcion?: string;
  foto_url?: string;
  origen?: string;
  verificado?: boolean;
  created_at?: string;
  ficha_url?: string;
}

export interface RespuestaVR {
  ok: boolean;
  total: number;
  limit: number;
  offset: number;
  personas: PersonaVR[];
}

/**
 * Obtiene una página de personas desde la API Venezuela Reporta.
 * @param offset - número de registros a saltar
 * @param limit  - registros por página (máx. 100 según la API)
 */
export async function fetchPersonasVR(offset = 0, limit = 100): Promise<RespuestaVR> {
  const url = `${API_BASE}?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Venezuela Reporta API error: ${res.status}`);
  return res.json() as Promise<RespuestaVR>;
}

/**
 * Mapea un registro de Venezuela Reporta al tipo RegistroMedico local.
 */
export function mapearPersonaVR(p: PersonaVR): RegistroMedico {
  return {
    id: `vr-${p.id}`,
    nombre: p.nombre,
    edad: p.edad,
    cedula: p.cedula,
    genero: p.genero,
    // Marcamos la condición médica como "Persona buscada"
    patologia: "Persona buscada",
    tratamiento: "Sin especificar",
    condicionesMedicas: [
      {
        patologia: "Persona buscada",
        medicamentos: [{ nombre: "Sin especificar" }],
      },
    ],
    ciudad: p.ciudad ?? "",
    municipio: p.zona,
    direccion: p.ultima_vez,
    telefono: "",
    foto: p.foto_url,
    origenExterno: "venezuelareporta",
    origenId: p.id,
    fichaUrl: p.ficha_url,
    creadoEn: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
  };
}

/**
 * Filtra los registros de la API que no existen ya en los registros locales.
 * Cruza por cedula y origenId para evitar duplicados.
 */
export function filtrarNuevos(
  personasVR: PersonaVR[],
  existentes: RegistroMedico[],
): PersonaVR[] {
  const cedulasExistentes = new Set(existentes.map((r) => r.cedula).filter(Boolean));
  const origenIdsExistentes = new Set(existentes.map((r) => r.origenId).filter(Boolean));

  return personasVR.filter((p) => {
    if (p.cedula && cedulasExistentes.has(p.cedula)) return false;
    if (origenIdsExistentes.has(p.id)) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────
// Deduplicación y fusión de registros locales
// ─────────────────────────────────────────────────────────────────────

/**
 * Devuelve el string más largo/completo entre dos valores opcionales.
 */
function mejorStr(a?: string, b?: string): string | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return a.length >= b.length ? a : b;
}

/**
 * Fusiona dos registros médicos en uno solo tomando los campos más completos.
 * El registro `base` es el que se conserva (su id permanece).
 */
export function fusionarRegistros(
  base: RegistroMedico,
  duplicado: RegistroMedico,
): RegistroMedico {
  // Unir condiciones médicas eliminando repeticiones por patología
  const condicionesBase = base.condicionesMedicas ?? [];
  const condicionesDup = duplicado.condicionesMedicas ?? [];
  const patologiasBase = new Set(condicionesBase.map((c) => c.patologia.toLowerCase()));

  const condicionesMerged = [
    ...condicionesBase,
    ...condicionesDup.filter((c) => !patologiasBase.has(c.patologia.toLowerCase())),
  ];

  return {
    ...base,
    nombre: mejorStr(base.nombre, duplicado.nombre) ?? base.nombre,
    edad: base.edad ?? duplicado.edad,
    cedula: mejorStr(base.cedula, duplicado.cedula),
    genero: mejorStr(base.genero, duplicado.genero),
    ciudad: mejorStr(base.ciudad, duplicado.ciudad) ?? "",
    municipio: mejorStr(base.municipio, duplicado.municipio),
    parroquia: mejorStr(base.parroquia, duplicado.parroquia),
    direccion: mejorStr(base.direccion, duplicado.direccion),
    telefono: mejorStr(base.telefono, duplicado.telefono) ?? "",
    foto: base.foto ?? duplicado.foto,
    hospital: mejorStr(base.hospital, duplicado.hospital),
    area: mejorStr(base.area, duplicado.area),
    estadoSalud: mejorStr(base.estadoSalud, duplicado.estadoSalud),
    fichaUrl: base.fichaUrl ?? duplicado.fichaUrl,
    origenExterno: base.origenExterno ?? duplicado.origenExterno,
    origenId: base.origenId ?? duplicado.origenId,
    condicionesMedicas: condicionesMerged.length > 0 ? condicionesMerged : undefined,
    patologia: mejorStr(base.patologia, duplicado.patologia) ?? "",
    tratamiento: mejorStr(base.tratamiento, duplicado.tratamiento) ?? "",
  };
}

/**
 * Detecta duplicados en una lista de registros locales (por cédula o nombre similar)
 * y devuelve:
 *  - `fusionados`: registros fusionados que reemplazarán a los originales
 *  - `eliminar`: ids de los registros secundarios que deben borrarse de Firestore
 *  - `totalGrupos`: cuántos grupos de duplicados se encontraron
 */
export function detectarYFusionarDuplicados(registros: RegistroMedico[]): {
  fusionados: RegistroMedico[];
  eliminar: string[];
  totalGrupos: number;
} {
  const visitados = new Set<string>();
  const fusionados: RegistroMedico[] = [];
  const eliminar: string[] = [];
  let totalGrupos = 0;

  for (let i = 0; i < registros.length; i++) {
    const base = registros[i];
    if (visitados.has(base.id)) continue;

    const grupo: RegistroMedico[] = [base];

    for (let j = i + 1; j < registros.length; j++) {
      const cand = registros[j];
      if (visitados.has(cand.id)) continue;

      const esDuplicado =
        // misma cédula
        (base.cedula && cand.cedula && base.cedula === cand.cedula) ||
        // mismo origenId externo
        (base.origenId && cand.origenId && base.origenId === cand.origenId) ||
        // mismo nombre normalizado Y misma ciudad
        (
          base.nombre.trim().toLowerCase() === cand.nombre.trim().toLowerCase() &&
          base.ciudad?.toLowerCase() === cand.ciudad?.toLowerCase()
        );

      if (esDuplicado) {
        grupo.push(cand);
        visitados.add(cand.id);
      }
    }

    visitados.add(base.id);

    if (grupo.length > 1) {
      totalGrupos++;
      // Fusionar todos en el primero
      let merged = grupo[0];
      for (let k = 1; k < grupo.length; k++) {
        merged = fusionarRegistros(merged, grupo[k]);
        eliminar.push(grupo[k].id);
      }
      fusionados.push(merged);
    } else {
      fusionados.push(base);
    }
  }

  return { fusionados, eliminar, totalGrupos };
}

