// Módulo de gestión de API Keys para el endpoint público de hospitalizados.
// Las keys se almacenan en Firestore (colección "api_keys") o en localStorage (modo demo).

import type { ApiKey } from "./types";
export type { ApiKey };

/** Genera una API Key con prefijo legible */
export function generarApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `vz_${hex}`;
}
