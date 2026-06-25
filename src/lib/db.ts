// Capa de datos unificada.
//  - Si Firebase está configurado: usa Firestore + Storage.
//  - Si no: MODO DEMO con localStorage (sembrado con datos de Venezuela).
import { firebaseHabilitado, getFirebase } from "./firebase";
import {
  centrosSeed,
  medicamentosSeed,
  rescatesSeed,
  registrosMedicosSeed,
} from "./seed";
import type {
  Centro,
  Review,
  RegistroMedico,
  Medicamento,
  Rescate,
  Baliza,
  Usuario,
} from "./types";

export const esDemo = !firebaseHabilitado;

export function nuevoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/* ----------------------------- MODO DEMO (localStorage) ----------------------------- */

const LS_PREFIX = "acopio:";

function lsGet<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  const raw = localStorage.getItem(LS_PREFIX + key);
  if (raw === null) {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

function lsSet<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    // localStorage lleno (p.ej. fotos grandes en demo) — degradar sin romper.
    console.warn("No se pudo guardar en modo demo:", e);
  }
}

/* ----------------------------- Firestore helpers ----------------------------- */

async function fsAll<T>(col: string): Promise<T[]> {
  const { db } = getFirebase();
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db!, col));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];
}

async function fsSet(col: string, id: string, data: object) {
  const { db } = getFirebase();
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db!, col, id), data, { merge: true });
}

async function fsUpdate(col: string, id: string, data: object) {
  const { db } = getFirebase();
  const { doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db!, col, id), data);
}

async function fsDelete(col: string, id: string) {
  const { db } = getFirebase();
  const { doc, deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db!, col, id));
}

/* ----------------------------- Subida de imágenes ----------------------------- */

/** En modo real sube a Storage; en demo devuelve el dataURL tal cual. */
export async function subirFoto(dataUrl: string, ruta: string): Promise<string> {
  if (esDemo) return dataUrl;
  const { storage } = getFirebase();
  const { ref, uploadString, getDownloadURL } = await import("firebase/storage");
  const r = ref(storage!, ruta);
  await uploadString(r, dataUrl, "data_url");
  return getDownloadURL(r);
}

/* =============================== CENTROS =============================== */

export async function listarCentros(): Promise<Centro[]> {
  const all = esDemo ? lsGet<Centro>("centros", centrosSeed) : await fsAll<Centro>("centros");
  return all.sort((a, b) => b.creadoEn - a.creadoEn);
}

export async function listarCentrosAprobados(): Promise<Centro[]> {
  return (await listarCentros()).filter((c) => c.estado === "aprobado");
}

export async function obtenerCentro(id: string): Promise<Centro | null> {
  const all = await listarCentros();
  return all.find((c) => c.id === id) ?? null;
}

export async function crearCentro(c: Centro): Promise<void> {
  if (esDemo) {
    const all = lsGet<Centro>("centros", centrosSeed);
    lsSet("centros", [c, ...all]);
    return;
  }
  await fsSet("centros", c.id, c as unknown as object);
}

export async function moderarCentro(
  id: string,
  estado: "aprobado" | "rechazado",
  motivoRechazo?: string,
): Promise<void> {
  if (esDemo) {
    const all = lsGet<Centro>("centros", centrosSeed);
    lsSet(
      "centros",
      all.map((c) => (c.id === id ? { ...c, estado, motivoRechazo: motivoRechazo ?? "" } : c)),
    );
    return;
  }
  await fsUpdate("centros", id, { estado, motivoRechazo: motivoRechazo ?? "" });
}

export async function actualizarCentro(c: Centro): Promise<void> {
  if (esDemo) {
    const all = lsGet<Centro>("centros", centrosSeed);
    lsSet(
      "centros",
      all.map((x) => (x.id === c.id ? c : x)),
    );
    return;
  }
  await fsSet("centros", c.id, c as unknown as object);
}

/* =============================== REVIEWS =============================== */

export async function listarReviews(centroId: string): Promise<Review[]> {
  const all = esDemo ? lsGet<Review>("reviews", []) : await fsAll<Review>("reviews");
  return all.filter((r) => r.centroId === centroId).sort((a, b) => b.creadoEn - a.creadoEn);
}

export async function crearReview(r: Review): Promise<void> {
  if (esDemo) {
    const all = lsGet<Review>("reviews", []);
    lsSet("reviews", [r, ...all]);
  } else {
    await fsSet("reviews", r.id, r as unknown as object);
  }
  await recomputarRating(r.centroId);
}

async function recomputarRating(centroId: string) {
  const reviews = await listarReviews(centroId);
  const count = reviews.length;
  const prom = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  if (esDemo) {
    const all = lsGet<Centro>("centros", centrosSeed);
    lsSet(
      "centros",
      all.map((c) =>
        c.id === centroId ? { ...c, ratingProm: Number(prom.toFixed(2)), ratingCount: count } : c,
      ),
    );
  } else {
    await fsUpdate("centros", centroId, { ratingProm: Number(prom.toFixed(2)), ratingCount: count });
  }
}

/* =============================== MÉDICOS =============================== */

export async function listarRegistrosMedicos(): Promise<RegistroMedico[]> {
  const all = esDemo
    ? lsGet<RegistroMedico>("medicos", registrosMedicosSeed)
    : await fsAll<RegistroMedico>("medicos");
  return all.sort((a, b) => b.creadoEn - a.creadoEn);
}

export async function crearRegistroMedico(r: RegistroMedico): Promise<void> {
  if (esDemo) {
    const all = lsGet<RegistroMedico>("medicos", registrosMedicosSeed);
    lsSet("medicos", [r, ...all]);
    return;
  }
  await fsSet("medicos", r.id, r as unknown as object);
}

export async function eliminarRegistroMedico(id: string): Promise<void> {
  if (esDemo) {
    const all = lsGet<RegistroMedico>("medicos", registrosMedicosSeed);
    lsSet("medicos", all.filter(m => m.id !== id));
    return;
  }
  await fsDelete("medicos", id);
}

/* =============================== MEDICAMENTOS =============================== */

export async function listarMedicamentos(): Promise<Medicamento[]> {
  const all = esDemo
    ? lsGet<Medicamento>("medicamentos", medicamentosSeed)
    : await fsAll<Medicamento>("medicamentos");
  return all.sort((a, b) => b.creadoEn - a.creadoEn);
}

export async function crearMedicamento(m: Medicamento): Promise<void> {
  if (esDemo) {
    const all = lsGet<Medicamento>("medicamentos", medicamentosSeed);
    lsSet("medicamentos", [m, ...all]);
    return;
  }
  await fsSet("medicamentos", m.id, m as unknown as object);
}

export async function eliminarMedicamento(id: string): Promise<void> {
  if (esDemo) {
    const all = lsGet<Medicamento>("medicamentos", medicamentosSeed);
    lsSet("medicamentos", all.filter(m => m.id !== id));
    return;
  }
  await fsDelete("medicamentos", id);
}

export async function ajustarCantidadMedicamento(id: string, delta: number): Promise<void> {
  if (esDemo) {
    const all = lsGet<Medicamento>("medicamentos", medicamentosSeed);
    lsSet(
      "medicamentos",
      all.map((m) => (m.id === id ? { ...m, cantidad: Math.max(0, m.cantidad + delta) } : m)),
    );
    return;
  }
  const all = await listarMedicamentos();
  const m = all.find((x) => x.id === id);
  if (m) await fsUpdate("medicamentos", id, { cantidad: Math.max(0, m.cantidad + delta) });
}

/* =============================== RESCATE =============================== */

export async function listarRescates(): Promise<Rescate[]> {
  const all = esDemo ? lsGet<Rescate>("rescates", rescatesSeed) : await fsAll<Rescate>("rescates");
  return all.sort((a, b) => Number(a.resuelto) - Number(b.resuelto) || b.creadoEn - a.creadoEn);
}

export async function crearRescate(r: Rescate): Promise<void> {
  if (esDemo) {
    const all = lsGet<Rescate>("rescates", rescatesSeed);
    lsSet("rescates", [r, ...all]);
    return;
  }
  await fsSet("rescates", r.id, r as unknown as object);
}

export async function marcarRescateResuelto(id: string, resuelto: boolean): Promise<void> {
  if (esDemo) {
    const all = lsGet<Rescate>("rescates", rescatesSeed);
    lsSet("rescates", all.map((r) => (r.id === id ? { ...r, resuelto } : r)));
    return;
  }
  await fsUpdate("rescates", id, { resuelto });
}

/* =============================== BALIZAS (buscar familiar) =============================== */

export async function listarBalizas(codigoFamilia: string): Promise<Baliza[]> {
  const all = esDemo ? lsGet<Baliza>("balizas", []) : await fsAll<Baliza>("balizas");
  return all
    .filter((b) => b.codigoFamilia.toUpperCase() === codigoFamilia.toUpperCase())
    .sort((a, b) => b.actualizadoEn - a.actualizadoEn);
}

export async function publicarBaliza(b: Baliza): Promise<void> {
  if (esDemo) {
    const all = lsGet<Baliza>("balizas", []);
    const otras = all.filter((x) => x.id !== b.id);
    lsSet("balizas", [b, ...otras]);
    return;
  }
  await fsSet("balizas", b.id, b as unknown as object);
}

/* =============================== USUARIOS =============================== */

export async function guardarUsuario(u: Usuario): Promise<void> {
  if (esDemo) {
    const all = lsGet<Usuario>("usuarios", []);
    const otras = all.filter((x) => x.uid !== u.uid);
    lsSet("usuarios", [...otras, u]);
    return;
  }
  await fsSet("usuarios", u.uid, u as unknown as object);
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const all = esDemo ? lsGet<Usuario>("usuarios", []) : await fsAll<Usuario>("usuarios");
  return all.sort((a, b) => a.nombre.localeCompare(b.nombre));
}
