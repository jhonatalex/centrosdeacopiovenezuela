"use client";

import Link from "next/link";
import { LogIn, LogOut, ShieldCheck, HeartHandshake } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { esDemo } from "@/lib/db";
import { Button } from "./ui";

export default function TopBar() {
  const { usuario, iniciarSesion, cerrarSesion, cargando } = useAuth();

  return (
    <header className="z-[900] shrink-0 border-b border-border bg-surface/85 backdrop-blur-md pt-safe">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-[0.9rem] bg-primary text-on-primary clay-btn">
            <img src="/og-image.png" alt="" className="size-7" />
          </span>
          <span className="font-display text-[15px] font-bold leading-tight tracking-tight">
            Centros de Acopio
            <span className="block text-[10px] font-medium text-muted">Ayuda en emergencias · Venezuela</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          {usuario?.esAdmin && (
            <Link
              href="/admin"
              className="hidden items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-warning sm:inline-flex"
            >
              <ShieldCheck className="size-4" /> Admin
            </Link>
          )}
          {cargando ? null : usuario ? (
            <button
              onClick={cerrarSesion}
              className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-xs font-medium clay-sm active:clay-btn-pressed"
              title="Cerrar sesión"
            >
              {usuario.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={usuario.foto} alt="" className="size-7 rounded-full" />
              ) : (
                <span className="grid size-7 place-items-center rounded-full bg-primary text-on-primary text-[11px] font-bold">
                  {usuario.nombre.slice(0, 1).toUpperCase()}
                </span>
              )}
              <LogOut className="size-3.5 text-muted" />
            </button>
          ) : (
            <Button size="sm" variant="secondary" onClick={iniciarSesion}>
              <LogIn className="size-4" />
              Google
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
