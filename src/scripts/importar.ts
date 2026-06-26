import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Cargar variables de entorno desde .env.local manualmente para Node
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    content.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnvLocal();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Error: Faltan credenciales de Firebase en .env.local");
  process.exit(1);
}

// Convertidor de coordenadas Web Mercator (EPSG:3857) a WGS84 (EPSG:4326)
function webMercatorToWGS84(x: number, y: number) {
  const lng = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return { lat, lng };
}

// Elimina campos undefined recursivamente para evitar FirebaseError
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

interface RawRecord {
  attributes: {
    reciben_ayuda_economica: string | null;
    poblado_o_ciudad: string | null;
    estado: string;
    direccion: string;
    globalid: string;
    numeros_de_contacto: string | null;
    solicitan_materiales: string | null;
    long: number | null;
    organización_o_persona_de_conta: string;
    organizacionopersona: string | null;
    id: number | null;
    objectid: number;
    lat: number | null;
  };
  geometry: {
    x: number;
    y: number;
  };
}

async function importar() {
  const jsonPath = path.resolve(process.cwd(), "importar.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ Error: Crea el archivo 'importar.json' con los datos en la raíz del proyecto.");
    process.exit(1);
  }

  const rawContent = fs.readFileSync(jsonPath, "utf8");
  let data: any;
  try {
    data = JSON.parse(rawContent);
  } catch (e) {
    console.error("❌ Error: El archivo 'importar.json' no tiene un formato JSON válido.");
    process.exit(1);
  }

  // Si el JSON viene envuelto en un objeto o un array
  const registros: RawRecord[] = Array.isArray(data) ? data : data.features || [];

  if (registros.length === 0) {
    console.error("❌ Error: No se encontraron registros para importar.");
    process.exit(1);
  }

  console.log(`🚀 Iniciando importación de ${registros.length} centros...`);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const item of registros) {
    const attr = item.attributes;
    const geom = item.geometry;

    if (!attr) continue;

    // 1. Obtener coordenadas
    let lat = attr.lat;
    let lng = attr.long;

    if (lat === null || lng === null) {
      if (geom && geom.x && geom.y) {
        const coords = webMercatorToWGS84(geom.x, geom.y);
        lat = coords.lat;
        lng = coords.lng;
      } else {
        console.warn(`⚠️ Saltando centro ${attr.globalid || attr.objectid}: no tiene coordenadas.`);
        continue;
      }
    }

    // 2. Generar nombre descriptivo
    const org = attr.organización_o_persona_de_conta || attr.organizacionopersona || "Centro de Acopio";
    const ciudad = attr.poblado_o_ciudad ? ` - ${attr.poblado_o_ciudad}` : "";
    const nombre = `${org}${ciudad}`.trim();

    // 3. Parsear materiales necesitados
    const necesita = attr.solicitan_materiales && attr.solicitan_materiales.toLowerCase() !== "sin información"
      ? attr.solicitan_materiales.split(",").map((x) => x.trim()).filter(Boolean)
      : [];

    // 4. Limpiar ID único a partir del globalid o el objectid
    const cleanId = attr.globalid
      ? attr.globalid.replace(/[{}]/g, "").toLowerCase()
      : `centro-${attr.objectid || Date.now()}`;

    // 5. Estructurar el objeto Centro
    const centro = {
      id: cleanId,
      nombre,
      fotos: [], // Se pueden subir imágenes después desde la UI
      direccion: attr.direccion || `Dirección en ${attr.estado}`,
      ciudad: attr.poblado_o_ciudad || "Otra",
      zona: attr.estado,
      contactoCentro: attr.numeros_de_contacto || "—",
      ubicacion: { lat, lng },
      necesita,
      sobra: [],
      descripcion: attr.reciben_ayuda_economica
        ? `Ayuda económica: ${attr.reciben_ayuda_economica}`
        : undefined,
      estado: "aprobado", // Aprobado automáticamente al ser importado por el admin
      creadoEn: Date.now(),
      registradorNombre: "Importador automático",
      registradorContacto: "—",
    };

    // 6. Escribir en Firestore
    try {
      const docRef = doc(db, "centros", cleanId);
      await setDoc(docRef, limpiarUndefined(centro), { merge: true });
      console.log(`✅ Importado: ${nombre} (${cleanId})`);
    } catch (error) {
      console.error(`❌ Error al importar centro ${nombre}:`, error);
    }
  }

  console.log("🎉 ¡Importación completada con éxito!");
}

importar().catch(console.error);
