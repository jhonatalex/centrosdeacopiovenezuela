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
  SolicitudResponsabilidad,
  WhaibotConfig,
  WhaibotPlantilla,
  ApiKey,
  WhaibotEnvio,
  EmailCampania,
  EmailEnvioLog,
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

function limpiarUndefined(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(limpiarUndefined);
  const clean: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = limpiarUndefined(val);
    }
  });
  return clean;
}

async function fsSet(col: string, id: string, data: object) {
  const { db } = getFirebase();
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db!, col, id), limpiarUndefined(data), { merge: true });
}

async function fsUpdate(col: string, id: string, data: object) {
  const { db } = getFirebase();
  const { doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db!, col, id), limpiarUndefined(data));
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

export async function listarCentros(limitCount?: number): Promise<Centro[]> {
  if (esDemo) {
    const all = lsGet<Centro>("centros", centrosSeed);
    const sorted = all.sort((a, b) => b.creadoEn - a.creadoEn);
    return limitCount ? sorted.slice(0, limitCount) : sorted;
  }
  const { db } = getFirebase();
  const { collection, query, orderBy, limit, getDocs } = await import("firebase/firestore");
  const qArgs: any[] = [orderBy("creadoEn", "desc")];
  if (limitCount) qArgs.push(limit(limitCount));
  const q = query(collection(db!, "centros"), ...qArgs);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({id: d.id, ...d.data()} as Centro));
}

export async function listarCentrosAprobados(limitCount?: number): Promise<Centro[]> {
  return (await listarCentros(limitCount)).filter((c) => c.estado === "aprobado");
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

export async function actualizarNecesidadesCentro(id: string, necesita: string[], sobra: string[]): Promise<void> {
  if (esDemo) {
    const all = lsGet<Centro>("centros", centrosSeed);
    lsSet(
      "centros",
      all.map((c) => (c.id === id ? { ...c, necesita, sobra } : c)),
    );
    return;
  }
  await fsUpdate("centros", id, { necesita, sobra });
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

export async function contarHospitalizados(): Promise<number> {
  if (esDemo) {
    const all = lsGet<RegistroMedico>("medicos", registrosMedicosSeed);
    return all.filter((r) => r.hospitalizado).length;
  }
  const { db } = getFirebase();
  const { collection, query, where, getCountFromServer } = await import("firebase/firestore");
  const q = query(collection(db!, "medicos"), where("hospitalizado", "==", true));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function listarHospitalizados(limitCount?: number): Promise<RegistroMedico[]> {
  if (esDemo) {
    const all = lsGet<RegistroMedico>("medicos", registrosMedicosSeed);
    const h = all.filter((r) => r.hospitalizado).sort((a, b) => b.creadoEn - a.creadoEn);
    return limitCount ? h.slice(0, limitCount) : h;
  }
  const { db } = getFirebase();
  const { collection, query, where, limit, getDocs } = await import("firebase/firestore");
  const qArgs: any[] = [where("hospitalizado", "==", true)];
  if (limitCount) qArgs.push(limit(limitCount));
  const q = query(collection(db!, "medicos"), ...qArgs);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({id: d.id, ...d.data()} as RegistroMedico));
}

export async function listarRegistrosMedicos(limitCount?: number): Promise<RegistroMedico[]> {
  if (esDemo) {
    const all = lsGet<RegistroMedico>("medicos", registrosMedicosSeed);
    const sorted = all.sort((a, b) => b.creadoEn - a.creadoEn);
    return limitCount ? sorted.slice(0, limitCount) : sorted;
  }
  const { db } = getFirebase();
  const { collection, query, orderBy, limit, getDocs } = await import("firebase/firestore");
  const qArgs: any[] = [orderBy("creadoEn", "desc")];
  if (limitCount) qArgs.push(limit(limitCount));
  const q = query(collection(db!, "medicos"), ...qArgs);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({id: d.id, ...d.data()} as RegistroMedico));
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

/**
 * Importación en lote: guarda múltiples registros médicos a la vez.
 * En modo demo usa localStorage; en Firebase usa escrituras individuales secuenciales
 * (Firestore batch tiene límite de 500 operaciones por batch).
 */
export async function importarRegistrosMedicos(registros: RegistroMedico[]): Promise<void> {
  if (registros.length === 0) return;
  if (esDemo) {
    const all = lsGet<RegistroMedico>("medicos", registrosMedicosSeed);
    lsSet("medicos", [...registros, ...all]);
    return;
  }
  // Firestore: escribir en lotes de hasta 500
  const { db } = getFirebase();
  const { writeBatch, doc, collection } = await import("firebase/firestore");
  const CHUNK = 500;
  for (let i = 0; i < registros.length; i += CHUNK) {
    const batch = writeBatch(db!);
    registros.slice(i, i + CHUNK).forEach((r) => {
      const ref = doc(collection(db!, "medicos"), r.id);
      batch.set(ref, limpiarUndefined(r as unknown as object), { merge: true });
    });
    await batch.commit();
  }
}

/** Elimina múltiples registros médicos en lote (para limpieza de duplicados). */
export async function eliminarRegistrosMedicos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (esDemo) {
    const all = lsGet<RegistroMedico>("medicos", registrosMedicosSeed);
    lsSet("medicos", all.filter((m) => !ids.includes(m.id)));
    return;
  }
  const { db } = getFirebase();
  const { writeBatch, doc } = await import("firebase/firestore");
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db!);
    ids.slice(i, i + CHUNK).forEach((id) => batch.delete(doc(db!, "medicos", id)));
    await batch.commit();
  }
}


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

export async function contarRescatesActivos(): Promise<number> {
  if (esDemo) {
    const all = lsGet<Rescate>("rescates", rescatesSeed);
    return all.filter((r) => !r.resuelto).length;
  }
  const { db } = getFirebase();
  const { collection, query, where, getCountFromServer } = await import("firebase/firestore");
  const q = query(collection(db!, "rescates"), where("resuelto", "==", false));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function listarRescates(limitCount?: number): Promise<Rescate[]> {
  if (esDemo) {
    const all = lsGet<Rescate>("rescates", rescatesSeed);
    const sorted = all.sort((a, b) => Number(a.resuelto) - Number(b.resuelto) || b.creadoEn - a.creadoEn);
    return limitCount ? sorted.slice(0, limitCount) : sorted;
  }
  const { db } = getFirebase();
  const { collection, query, orderBy, limit, getDocs } = await import("firebase/firestore");
  const qArgs: any[] = [orderBy("creadoEn", "desc")];
  if (limitCount) qArgs.push(limit(limitCount));
  const q = query(collection(db!, "rescates"), ...qArgs);
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({id: d.id, ...d.data()} as Rescate));
  return results.sort((a, b) => Number(a.resuelto) - Number(b.resuelto) || b.creadoEn - a.creadoEn);
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

/* =============================== SOLICITUDES DE RESPONSABILIDAD =============================== */

export async function crearSolicitudResponsabilidad(s: SolicitudResponsabilidad): Promise<void> {
  if (esDemo) {
    const all = lsGet<SolicitudResponsabilidad>("solicitudes_resp", []);
    lsSet("solicitudes_resp", [s, ...all]);
    return;
  }
  await fsSet("solicitudes_resp", s.id, s as unknown as object);
}

export async function listarSolicitudesResponsabilidad(): Promise<SolicitudResponsabilidad[]> {
  const all = esDemo
    ? lsGet<SolicitudResponsabilidad>("solicitudes_resp", [])
    : await fsAll<SolicitudResponsabilidad>("solicitudes_resp");
  return all.sort((a, b) => b.creadoEn - a.creadoEn);
}

export async function responderSolicitudResponsabilidad(
  id: string,
  estado: "aceptada" | "rechazada"
): Promise<void> {
  if (esDemo) {
    const all = lsGet<SolicitudResponsabilidad>("solicitudes_resp", []);
    const solicitud = all.find((s) => s.id === id);
    if (!solicitud) return;

    // 1. Actualizar el estado de la solicitud
    const list = all.map((s) => (s.id === id ? { ...s, estado } : s));
    lsSet("solicitudes_resp", list);

    // 2. Si es aceptada, actualizar el registrador del centro
    if (estado === "aceptada") {
      const centros = lsGet<Centro>("centros", centrosSeed);
      lsSet(
        "centros",
        centros.map((c) =>
          c.id === solicitud.centroId
            ? {
              ...c,
              registradorUid: solicitud.solicitanteUid,
              registradorEmail: solicitud.solicitanteEmail,
              registradorNombre: solicitud.solicitanteNombre,
              registradorContacto: solicitud.solicitanteContacto,
            }
            : c
        )
      );
    }
    return;
  }

  // En Firebase
  await fsUpdate("solicitudes_resp", id, { estado });

  if (estado === "aceptada") {
    const all = await fsAll<SolicitudResponsabilidad>("solicitudes_resp");
    const solicitud = all.find((s) => s.id === id);
    if (solicitud) {
      await fsUpdate("centros", solicitud.centroId, {
        registradorUid: solicitud.solicitanteUid,
        registradorEmail: solicitud.solicitanteEmail,
        registradorNombre: solicitud.solicitanteNombre,
        registradorContacto: solicitud.solicitanteContacto,
      });
    }
  }
}

/* =============================== WHAIBOT =============================== */

const WHAIBOT_DOC_ID = "config";

/** Lee la configuración de WhaiBot (botId + apiKey) */
export async function obtenerWhaibotConfig(): Promise<WhaibotConfig | null> {
  if (esDemo) {
    const raw = typeof window !== "undefined" ? localStorage.getItem("acopio:whaibot_config") : null;
    return raw ? (JSON.parse(raw) as WhaibotConfig) : null;
  }
  const { db } = getFirebase();
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db!, "whaibot", WHAIBOT_DOC_ID));
  return snap.exists() ? (snap.data() as WhaibotConfig) : null;
}

/** Guarda (o actualiza) las credenciales de WhaiBot */
export async function guardarWhaibotConfig(config: WhaibotConfig): Promise<void> {
  if (esDemo) {
    if (typeof window !== "undefined") {
      localStorage.setItem("acopio:whaibot_config", JSON.stringify(config));
    }
    return;
  }
  await fsSet("whaibot", WHAIBOT_DOC_ID, config as unknown as object);
}

/** Lista todas las plantillas de mensaje */
export async function listarPlantillas(): Promise<WhaibotPlantilla[]> {
  if (esDemo) {
    const raw = typeof window !== "undefined" ? localStorage.getItem("acopio:whaibot_plantillas") : null;
    return raw ? (JSON.parse(raw) as WhaibotPlantilla[]) : [];
  }
  return fsAll<WhaibotPlantilla>("whaibot_plantillas");
}

/** Crea una nueva plantilla */
export async function crearPlantilla(p: WhaibotPlantilla): Promise<void> {
  if (esDemo) {
    const all = await listarPlantillas();
    if (typeof window !== "undefined") {
      localStorage.setItem("acopio:whaibot_plantillas", JSON.stringify([p, ...all]));
    }
    return;
  }
  await fsSet("whaibot_plantillas", p.id, p as unknown as object);
}

/** Actualiza una plantilla existente */
export async function actualizarPlantilla(p: WhaibotPlantilla): Promise<void> {
  if (esDemo) {
    const all = await listarPlantillas();
    const updated = all.map((x) => (x.id === p.id ? p : x));
    if (typeof window !== "undefined") {
      localStorage.setItem("acopio:whaibot_plantillas", JSON.stringify(updated));
    }
    return;
  }
  await fsSet("whaibot_plantillas", p.id, p as unknown as object);
}

/** Elimina una plantilla */
export async function eliminarPlantilla(id: string): Promise<void> {
  if (esDemo) {
    const all = await listarPlantillas();
    if (typeof window !== "undefined") {
      localStorage.setItem("acopio:whaibot_plantillas", JSON.stringify(all.filter((x) => x.id !== id)));
    }
    return;
  }
  const { db } = getFirebase();
  const { doc, deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db!, "whaibot_plantillas", id));
}

/* =============================== API KEYS (hospitalizados) =============================== */

export async function listarApiKeys(): Promise<ApiKey[]> {
  if (esDemo) {
    const raw = typeof window !== "undefined" ? localStorage.getItem("acopio:api_keys") : null;
    return raw ? (JSON.parse(raw) as ApiKey[]) : [];
  }
  return fsAll<ApiKey>("api_keys");
}

export async function crearApiKey(key: ApiKey): Promise<void> {
  if (esDemo) {
    const all = await listarApiKeys();
    if (typeof window !== "undefined") {
      localStorage.setItem("acopio:api_keys", JSON.stringify([key, ...all]));
    }
    return;
  }
  await fsSet("api_keys", key.id, key as unknown as object);
}

export async function revocarApiKey(id: string): Promise<void> {
  if (esDemo) {
    const all = await listarApiKeys();
    const updated = all.map((k) => (k.id === id ? { ...k, activa: false } : k));
    if (typeof window !== "undefined") {
      localStorage.setItem("acopio:api_keys", JSON.stringify(updated));
    }
    return;
  }
  await fsUpdate("api_keys", id, { activa: false });
}

export async function eliminarApiKey(id: string): Promise<void> {
  if (esDemo) {
    const all = await listarApiKeys();
    if (typeof window !== "undefined") {
      localStorage.setItem("acopio:api_keys", JSON.stringify(all.filter((k) => k.id !== id)));
    }
    return;
  }
  await fsDelete("api_keys", id);
}

/**
 * Valida una API Key y actualiza su timestamp de último uso.
 * Devuelve la key si es válida y activa, null si no.
 * SOLO para uso en rutas de servidor (Route Handlers).
 */
export async function validarApiKey(token: string): Promise<ApiKey | null> {
  if (!token) return null;
  if (esDemo) return null; // en modo demo no hay servidor
  const { db } = getFirebase();
  if (!db) return null;
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "api_keys", token));
  if (!snap.exists()) return null;
  const key = snap.data() as ApiKey;
  if (!key.activa) return null;
  // Actualizar ultimoUso de forma no bloqueante
  updateDoc(snap.ref, { ultimoUso: Date.now() }).catch(() => {});
  return key;
}
/* ===================== WHAIBOT HISTORIAL DE ENVÍOS ===================== */

/** Registra un envío de WhatsApp (llamar después de cada send) */
export async function registrarEnvioWhaibot(envio: WhaibotEnvio): Promise<void> {
  if (esDemo) {
    const all = lsGet<WhaibotEnvio>("whaibot_envios", []);
    lsSet("whaibot_envios", [envio, ...all]);
    return;
  }
  await fsSet("whaibot_envios", envio.id, envio as unknown as object);
}

/** Lista envíos de WhatsApp. Si se pasa plantillaId filtra por esa plantilla. */
export async function listarEnviosWhaibot(plantillaId?: string): Promise<WhaibotEnvio[]> {
  const all = esDemo
    ? lsGet<WhaibotEnvio>("whaibot_envios", [])
    : await fsAll<WhaibotEnvio>("whaibot_envios");
  const sorted = all.sort((a, b) => b.enviadoEn - a.enviadoEn);
  return plantillaId ? sorted.filter((e) => e.plantillaId === plantillaId) : sorted;
}

/** ¿Ya se envió esta plantilla a este número? */
export async function yaEnviadoWhaibot(plantillaId: string, numero: string): Promise<boolean> {
  const envios = await listarEnviosWhaibot(plantillaId);
  return envios.some((e) => e.numero === numero && e.ok);
}

/* ===================== EMAIL CAMPAÑAS ===================== */

export async function listarCampaniasEmail(): Promise<EmailCampania[]> {
  if (esDemo) {
    const raw = typeof window !== "undefined" ? localStorage.getItem("acopio:email_campanias") : null;
    return raw ? (JSON.parse(raw) as EmailCampania[]) : [];
  }
  return fsAll<EmailCampania>("email_campanias");
}

export async function crearCampaniaEmail(c: EmailCampania): Promise<void> {
  if (esDemo) {
    const all = await listarCampaniasEmail();
    if (typeof window !== "undefined") {
      localStorage.setItem("acopio:email_campanias", JSON.stringify([c, ...all]));
    }
    return;
  }
  await fsSet("email_campanias", c.id, c as unknown as object);
}

export async function actualizarCampaniaEmail(c: EmailCampania): Promise<void> {
  if (esDemo) {
    const all = await listarCampaniasEmail();
    if (typeof window !== "undefined") {
      localStorage.setItem("acopio:email_campanias", JSON.stringify(all.map((x) => (x.id === c.id ? c : x))));
    }
    return;
  }
  await fsSet("email_campanias", c.id, c as unknown as object);
}

export async function eliminarCampaniaEmail(id: string): Promise<void> {
  if (esDemo) {
    const all = await listarCampaniasEmail();
    if (typeof window !== "undefined") {
      localStorage.setItem("acopio:email_campanias", JSON.stringify(all.filter((x) => x.id !== id)));
    }
    return;
  }
  const { db } = getFirebase();
  const { doc, deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db!, "email_campanias", id));
}

/* ===================== EMAIL HISTORIAL DE ENVÍOS ===================== */

export async function registrarEnvioEmail(log: EmailEnvioLog): Promise<void> {
  if (esDemo) {
    const all = lsGet<EmailEnvioLog>("email_envios", []);
    lsSet("email_envios", [log, ...all]);
    return;
  }
  await fsSet("email_envios", log.id, log as unknown as object);
}

export async function listarEnviosEmail(campaniaId?: string): Promise<EmailEnvioLog[]> {
  const all = esDemo
    ? lsGet<EmailEnvioLog>("email_envios", [])
    : await fsAll<EmailEnvioLog>("email_envios");
  const sorted = all.sort((a, b) => b.enviadoEn - a.enviadoEn);
  return campaniaId ? sorted.filter((e) => e.campaniaId === campaniaId) : sorted;
}

/** ¿Ya se envió esta campaña a este email? */
export async function yaEnviadoEmail(campaniaId: string, email: string): Promise<boolean> {
  const envios = await listarEnviosEmail(campaniaId);
  return envios.some((e) => e.email === email && e.ok);
}
