"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { adminEmails, firebaseHabilitado, getFirebase } from "./firebase";
import type { Usuario } from "./types";

const esDemoAuth = !firebaseHabilitado;

interface AuthCtx {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  usuario: null,
  cargando: true,
  iniciarSesion: async () => {},
  cerrarSesion: async () => {},
});

const DEMO_KEY = "acopio:demoUser";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (esDemoAuth) {
      const raw = typeof window !== "undefined" ? localStorage.getItem(DEMO_KEY) : null;
      setUsuario(raw ? (JSON.parse(raw) as Usuario) : null);
      setCargando(false);
      return;
    }
    let unsub = () => {};
    (async () => {
      const { auth } = getFirebase();
      const { onAuthStateChanged } = await import("firebase/auth");
      unsub = onAuthStateChanged(auth!, (u) => {
        if (u) {
          const userObj: Usuario = {
            uid: u.uid,
            nombre: u.displayName ?? "Usuario",
            email: u.email ?? "",
            foto: u.photoURL ?? undefined,
            esAdmin: adminEmails.includes((u.email ?? "").toLowerCase()),
          };
          setUsuario(userObj);
          import("./db").then(({ guardarUsuario }) => guardarUsuario(userObj));
        } else {
          setUsuario(null);
        }
        setCargando(false);
      });
    })();
    return () => unsub();
  }, []);

  async function iniciarSesion() {
    if (esDemoAuth) {
      // En modo demo simulamos una cuenta Google (con permisos de admin para poder probar todo).
      const demo: Usuario = {
        uid: "demo-user",
        nombre: "Usuario Demo",
        email: "demo@centrosdeacopio.app",
        foto: undefined,
        esAdmin: true,
      };
      localStorage.setItem(DEMO_KEY, JSON.stringify(demo));
      setUsuario(demo);
      import("./db").then(({ guardarUsuario }) => guardarUsuario(demo));
      return;
    }
    const { auth } = getFirebase();
    const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
    await signInWithPopup(auth!, new GoogleAuthProvider());
  }

  async function cerrarSesion() {
    if (esDemoAuth) {
      localStorage.removeItem(DEMO_KEY);
      setUsuario(null);
      return;
    }
    const { auth } = getFirebase();
    const { signOut } = await import("firebase/auth");
    await signOut(auth!);
  }

  return (
    <Ctx.Provider value={{ usuario, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
