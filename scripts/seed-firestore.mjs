// Inyecta datos de prueba en Firestore (proyecto centrosdeacopiovenezuela).
// Uso: node scripts/seed-firestore.mjs
// Estos datos son de PRUEBA; luego se pueden borrar desde el panel de admin.
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
const now = Date.now();

const centros = [
  {
    id: "seed-1",
    nombre: "Parroquia La Candelaria",
    fotos: [],
    direccion: "Av. Urdaneta, esquina Candilito",
    ciudad: "Caracas",
    zona: "La Candelaria",
    institucion: "Iglesia La Candelaria",
    contactoCentro: "+58 212 555 1010",
    ubicacion: { lat: 10.5061, lng: -66.9036 },
    necesita: ["Agua potable", "Pañales", "Antibióticos"],
    sobra: ["Ropa de adulto", "Frazadas"],
    descripcion: "Centro habilitado en el salón parroquial. Recibe donaciones de 8am a 6pm.",
    estado: "aprobado",
    creadoEn: now - 1000 * 60 * 60 * 24 * 3,
    ratingProm: 4.6,
    ratingCount: 12,
  },
  {
    id: "seed-2",
    nombre: "Escuela Bolivariana Maracaibo",
    fotos: [],
    direccion: "Calle 72 con Av. 15 Las Delicias",
    ciudad: "Maracaibo",
    zona: "Las Delicias",
    institucion: "Cruz Roja Zulia",
    contactoCentro: "+58 261 555 2020",
    ubicacion: { lat: 10.6545, lng: -71.6536 },
    necesita: ["Insulina", "Suero fisiológico", "Agua potable"],
    sobra: ["Arroz", "Pasta", "Enlatados"],
    descripcion: "Punto de acopio coordinado con voluntarios de la zona occidental.",
    estado: "aprobado",
    creadoEn: now - 1000 * 60 * 60 * 24 * 2,
    ratingProm: 4.2,
    ratingCount: 7,
  },
  {
    id: "seed-3",
    nombre: "Polideportivo Valencia",
    fotos: [],
    direccion: "Av. Bolívar Norte, sector San José",
    ciudad: "Valencia",
    zona: "San José",
    institucion: "Protección Civil Carabobo",
    contactoCentro: "+58 241 555 3030",
    ubicacion: { lat: 10.1862, lng: -68.0077 },
    necesita: ["Colchonetas", "Linternas", "Baterías"],
    sobra: ["Agua", "Ropa de niño"],
    estado: "aprobado",
    creadoEn: now - 1000 * 60 * 60 * 24,
    ratingProm: 4.8,
    ratingCount: 21,
  },
  {
    id: "seed-4",
    nombre: "Centro Comunitario Mérida",
    fotos: [],
    direccion: "Av. Las Américas, frente al estadio",
    ciudad: "Mérida",
    zona: "El Rincón",
    institucion: "Junta de vecinos",
    contactoCentro: "+58 274 555 4040",
    ubicacion: { lat: 8.5897, lng: -71.144 },
    necesita: ["Medicamentos para hipertensión", "Agua potable"],
    sobra: ["Frazadas", "Útiles de aseo"],
    estado: "pendiente",
    registradorNombre: "Ana Pérez",
    registradorContacto: "+58 414 555 0099",
    creadoEn: now - 1000 * 60 * 30,
  },
];

const medicamentos = [
  { id: "med-1", nombre: "Insulina NPH", presentacion: "Frasco 10ml", cantidad: 8, ciudad: "Caracas", ubicacionTexto: "Parroquia La Candelaria, Av. Urdaneta", contacto: "+58 212 555 1010", creadoEn: now - 1000 * 60 * 60 * 5 },
  { id: "med-2", nombre: "Amoxicilina", presentacion: "500mg cápsulas", cantidad: 30, ciudad: "Maracaibo", ubicacionTexto: "Escuela Bolivariana, Calle 72", contacto: "+58 261 555 2020", creadoEn: now - 1000 * 60 * 60 * 9 },
  { id: "med-3", nombre: "Losartán", presentacion: "50mg comprimidos", cantidad: 60, ciudad: "Valencia", ubicacionTexto: "Polideportivo Valencia", contacto: "+58 241 555 3030", creadoEn: now - 1000 * 60 * 60 * 20 },
];

const rescates = [
  { id: "res-1", direccion: "Sector La Pastora, callejón Los Pinos, casa 14", representante: "Vecino del sector", telefono: "+58 412 555 7777", detalle: "Familia con adulto mayor sin poder salir, vía bloqueada por escombros.", personasAtrapadas: 3, resuelto: false, creadoEn: now - 1000 * 60 * 45 },
];

async function main() {
  for (const c of centros) {
    await setDoc(doc(db, "centros", c.id), c);
    console.log("✓ centro:", c.nombre);
  }
  for (const m of medicamentos) {
    await setDoc(doc(db, "medicamentos", m.id), m);
    console.log("✓ medicamento:", m.nombre);
  }
  for (const r of rescates) {
    await setDoc(doc(db, "rescates", r.id), r);
    console.log("✓ rescate:", r.direccion);
  }
  console.log("\n✅ Datos de prueba inyectados correctamente.");
  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌ Error al inyectar:", e.code || e.message);
  process.exit(1);
});
