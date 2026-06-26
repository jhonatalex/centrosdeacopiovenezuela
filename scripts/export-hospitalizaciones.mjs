// Exporta TODOS los medical_cases del proyecto fuente (asistencia-medica-fvivemas)
// vía la API REST de Firestore, los normaliza a nuestro esquema y los guarda en
// scripts/hospitalizaciones-data.json. (Solo lectura; no escribe nada remoto.)
import { writeFileSync } from "node:fs";

const KEY = "AIzaSyAc98GrjI9_OcdoPNg1OAwy_gOWWc0iTmw";
const PROJ = "asistencia-medica-fvivemas";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJ}/databases/(default)/documents/medical_cases`;

// Convierte un valor REST de Firestore a JS plano.
function val(v) {
  if (v == null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("doubleValue" in v) return v.doubleValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return obj(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(val);
  return null;
}
function obj(fields) {
  const o = {};
  for (const k of Object.keys(fields)) o[k] = val(fields[k]);
  return o;
}

async function main() {
  let pageToken = "";
  const raw = [];
  let page = 0;
  do {
    const url = `${BASE}?pageSize=300&key=${KEY}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    (data.documents || []).forEach((d) => {
      const id = d.name.split("/").pop();
      raw.push({ id, ...obj(d.fields || {}) });
    });
    pageToken = data.nextPageToken || "";
    page++;
    console.log(`Página ${page}: acumulados ${raw.length}`);
  } while (pageToken);

  // Normaliza a nuestro esquema de "hospitalización".
  const norm = raw.map((c) => ({
    id: c.id,
    nombre: c.name || "",
    apellido: c.lastName || "",
    cedula: c.idCard || "",
    edad: c.age || "",
    genero: c.gender || "",
    diagnostico: c.diagnosis || "",
    estadoSalud: c.healthStatus || "",
    hospital: c.hospitalName || "",
    area: c.area || c.hospitalArea || "",
    ubicacion: c.coordinates && typeof c.coordinates.lat === "number"
      ? { lat: c.coordinates.lat, lng: c.coordinates.lng }
      : null,
    reporta: c.contact?.reporterName || "",
    contacto: Array.isArray(c.contact?.reporterPhone)
      ? c.contact.reporterPhone.join(", ")
      : (c.contact?.reporterPhone || ""),
    caseType: c.caseType || "",
    creadoEn: c.createdAt ? Date.parse(c.createdAt) || Date.now() : Date.now(),
  }));

  writeFileSync("scripts/hospitalizaciones-data.json", JSON.stringify(norm, null, 2));

  // Resumen
  const hospitales = {};
  norm.forEach((p) => { if (p.hospital) hospitales[p.hospital] = (hospitales[p.hospital] || 0) + 1; });
  const conCoords = norm.filter((p) => p.ubicacion).length;
  console.log(`\n✅ Total pacientes: ${norm.length}`);
  console.log(`   Con coordenadas: ${conCoords}`);
  console.log(`   Hospitales distintos: ${Object.keys(hospitales).length}`);
  console.log(`   caseTypes:`, [...new Set(norm.map((p) => p.caseType))]);
  console.log(`\n   Top hospitales por pacientes:`);
  Object.entries(hospitales).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([h, n]) => console.log(`     ${n}\t${h}`));
  console.log(`\n   Muestra:`, JSON.stringify(norm[0], null, 2));
}

main().catch((e) => { console.error("Error:", e); process.exit(1); });
