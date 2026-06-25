"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { esDemo } from "@/lib/db";

export default function DemoBanner() {
  const [oculto, setOculto] = useState(false);
  if (!esDemo || oculto) return null;
  return (
    <div className="shrink-0 border-b border-accent/30 bg-accent-soft">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2 text-xs text-warning">
        <Info className="size-4 shrink-0" />
        <p className="flex-1">
          <strong>Modo demo:</strong> los datos se guardan solo en este navegador. Configura Firebase
          (ver <code className="rounded bg-white/50 px-1">.env.local.example</code>) para producción.
        </p>
        <button onClick={() => setOculto(true)} aria-label="Cerrar aviso">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
