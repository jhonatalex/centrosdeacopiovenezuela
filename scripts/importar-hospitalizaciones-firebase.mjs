// Importa los pacientes exportados (scripts/hospitalizaciones-data.json) a NUESTRA
// Firebase, colección "medicos", como registros con hospitalizado=true.
// Idempotente: usa id "hosp-<idOrigen>". Escritura por lotes (batch de 500).
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getFirestore, writeBatch, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjiZj_nNXdz7oKmw0EUUZVkuixdbBgnqY",
  authDomain: "centrosdeacopiovenezuela.firebaseapp.com",
  projectId: "centrosdeacopiovenezuela",
  storageBucket: "centrosdeacopiovenezuela.firebasestorage.app",
  messagingSenderId: "523025301541",
  appId: "1:523025301541:web:6e33521993f3cf0aafbfcc",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const data = JSON.parse(readFileSync("scripts/hospitalizaciones-data.json", "utf8"));

function num(v) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

const registros = data.map((p) => {
  const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(" ").trim();
  const r = {
    id: `hosp-${p.id}`,
    nombre: nombreCompleto || "Paciente",
    apellido: p.apellido || "",
    cedula: p.cedula || "",
    patologia: p.diagnostico || "No especificado",
    tratamiento: p.estadoSalud || "No especificado",
    ciudad: "",
    telefono: p.contacto || "",
    hospitalizado: true,
    hospital: p.hospital || "",
    area: p.area || "",
    genero: p.genero || "",
    estadoSalud: p.estadoSalud || "",
    creadoEn: p.creadoEn || Date.now(),
    creadorEmail: "import@asistencia-medica",
  };
  if (p.edad) {
    const e = num(p.edad);
    if (e !== undefined) r.edad = e;
  }
  if (p.ubicacion && typeof p.ubicacion.lat === "number") r.ubicacion = p.ubicacion;
  return r;
});

async function main() {
  const CHUNK = 500;
  let escritos = 0;
  for (let i = 0; i < registros.length; i += CHUNK) {
    const lote = registros.slice(i, i + CHUNK);
    const batch = writeBatch(db);
    for (const r of lote) {
      batch.set(doc(db, "medicos", r.id), r, { merge: true });
    }
    await batch.commit();
    escritos += lote.length;
    console.log(`Escritos ${escritos}/${registros.length}`);
  }
  console.log(`\n✅ Importados ${escritos} pacientes hospitalizados a la colección "medicos".`);
  process.exit(0);
}

main().catch((e) => { console.error("❌ Error:", e.code || e.message); process.exit(1); });
