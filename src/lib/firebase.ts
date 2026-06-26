// Inicialización de Firebase (cliente).
// Si faltan las variables de entorno, la app corre en MODO DEMO (datos locales).
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** true cuando hay credenciales reales de Firebase configuradas. */
export const firebaseHabilitado = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/** Correos con permiso de administrador (hardcoded + configurados por env var). */
const administradoresDefinidos = [
  "neptalyx@gmail.com",
  "dirsdeveloper@gmail.com",
  "marketglobaldeveloper@gmail.com",
];

export const adminEmails = [
  ...administradoresDefinidos,
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
];

let app: FirebaseApp | undefined;
let dbInstance: Firestore | undefined;
let authInstance: Auth | undefined;
let storageInstance: FirebaseStorage | undefined;

export function getFirebase() {
  if (!firebaseHabilitado) return { app: undefined, db: undefined, auth: undefined, storage: undefined };
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
    authInstance = getAuth(app);
    storageInstance = getStorage(app);
  }
  return { app, db: dbInstance!, auth: authInstance!, storage: storageInstance! };
}
