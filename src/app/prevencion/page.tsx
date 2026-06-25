"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ShieldAlert,
  Users,
  Radio,
  Search,
  CheckCircle2,
  XCircle,
  Activity,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { listarBalizas, publicarBaliza } from "@/lib/db";
import type { Baliza, GeoPunto } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  SectionHeader,
  cx,
} from "@/components/ui";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function PrevencionPage() {
  return (
    <div className="px-4 pb-10 pt-4">
      <SectionHeader
        titulo="Prevención y seguridad"
        descripcion="Cómo identificar daños estructurales, actuar ante réplicas y reencontrarte con tu familia."
        icon={<ShieldAlert className="size-5" />}
        color="var(--sec-prevencion)"
      />

      <Grietas />
      <Replicas />
      <BuscarFamiliar />
    </div>
  );
}

/* ------------------------------- Grietas ------------------------------- */

const grietasPeligro = [
  "Diagonales o en forma de “X” en muros de carga.",
  "Horizontales anchas (más de 5 mm) en columnas o vigas.",
  "Que dejan ver el acero o el ladrillo interno.",
  "Que atraviesan todo el muro de lado a lado.",
  "Acompañadas de desplome o inclinación de la pared.",
];
const grietasSeguras = [
  "Finas y verticales en el repello o friso.",
  "Pequeñas fisuras en esquinas de puertas o ventanas.",
  "Superficiales en la pintura, sin profundidad.",
  "En tabiques que no sostienen el techo.",
];

function Grietas() {
  return (
    <section className="mt-6">
      <h2 className="mb-3 font-display text-lg font-bold">¿Qué grietas son peligrosas?</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-danger/30 p-4">
          <p className="mb-2 flex items-center gap-2 font-semibold text-danger">
            <XCircle className="size-5" /> Peligrosas — evacúa
          </p>
          <ul className="space-y-1.5 text-sm text-foreground/90">
            {grietasPeligro.map((g) => (
              <li key={g} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" /> {g}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="border-success/30 p-4">
          <p className="mb-2 flex items-center gap-2 font-semibold text-success">
            <CheckCircle2 className="size-5" /> Generalmente no estructurales
          </p>
          <ul className="space-y-1.5 text-sm text-foreground/90">
            {grietasSeguras.map((g) => (
              <li key={g} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" /> {g}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="mt-2 text-xs text-muted">
        Ante la duda, evacúa y solicita evaluación de un ingeniero o de Protección Civil. No
        regreses a una estructura con grietas peligrosas.
      </p>
    </section>
  );
}

/* ------------------------------- Réplicas ------------------------------- */

const pasosReplica = [
  { t: "Mantén la calma", d: "Las réplicas son normales tras un sismo fuerte. Respira y actúa con orden." },
  { t: "Agáchate, cúbrete y agárrate", d: "Bajo una mesa resistente, lejos de ventanas, repisas y objetos que caigan." },
  { t: "Si estás afuera", d: "Aléjate de edificios, postes, cables eléctricos y muros." },
  { t: "En vehículo", d: "Detente en un lugar abierto y permanece dentro hasta que pase." },
  { t: "Después", d: "Revisa fugas de gas, no uses fósforos ni interruptores. Corta electricidad si hay daños." },
  { t: "Evacúa con tu mochila", d: "Lleva agua, linterna, documentos y medicinas. Usa escaleras, nunca el ascensor." },
];

function Replicas() {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <Activity className="size-5 text-[var(--sec-prevencion)]" /> Qué hacer en réplicas
      </h2>
      <ol className="space-y-2.5">
        {pasosReplica.map((p, i) => (
          <li key={p.t} className="flex gap-3 rounded-2xl border border-border bg-surface p-3.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-warning">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold">{p.t}</p>
              <p className="text-sm text-muted">{p.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* --------------------------- Buscar familiar (balizas) --------------------------- */

function BuscarFamiliar() {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [balizas, setBalizas] = useState<Baliza[]>([]);
  const [miPunto, setMiPunto] = useState<GeoPunto | null>(null);
  const [estado, setEstado] = useState<"idle" | "compartiendo" | "compartido">("idle");
  const [buscando, setBuscando] = useState(false);

  async function refrescar(cod = codigo) {
    if (!cod.trim()) return;
    setBuscando(true);
    try {
      setBalizas(await listarBalizas(cod.trim()));
    } finally {
      setBuscando(false);
    }
  }

  async function compartirUbicacion() {
    if (!codigo.trim() || !nombre.trim() || !navigator.geolocation) return;
    setEstado("compartiendo");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMiPunto(p);
        await publicarBaliza({
          id: `${codigo.trim().toUpperCase()}::${nombre.trim().toLowerCase()}`,
          codigoFamilia: codigo.trim().toUpperCase(),
          nombre: nombre.trim(),
          ubicacion: p,
          mensaje: mensaje.trim() || undefined,
          actualizadoEn: Date.now(),
        });
        setEstado("compartido");
        refrescar();
      },
      () => setEstado("idle"),
      { enableHighAccuracy: true },
    );
  }

  return (
    <section className="mt-8">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
        <Users className="size-5 text-[var(--sec-prevencion)]" /> Encontrar a un familiar
      </h2>
      <p className="mb-3 text-sm text-muted">
        Acuerden un <strong>código de familia</strong> (ej. una palabra). Cada quien comparte su
        ubicación con ese mismo código y todos podrán verse en el mapa.
      </p>

      <Card className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Código de familia" required>
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej. FAMILIA-PEREZ"
              className="uppercase"
            />
          </Field>
          <Field label="Tu nombre" required>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="María" />
          </Field>
        </div>
        <Field label="Mensaje (opcional)">
          <Input value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Estoy bien, en el refugio…" />
        </Field>
        <div className="flex gap-2">
          <Button
            full
            onClick={compartirUbicacion}
            cargando={estado === "compartiendo"}
            disabled={!codigo.trim() || !nombre.trim()}
            style={{ background: "var(--sec-prevencion)", color: "white" }}
          >
            <Radio className="size-4" /> Compartir mi ubicación
          </Button>
          <Button variant="secondary" onClick={() => refrescar()} disabled={!codigo.trim()} cargando={buscando}>
            <Search className="size-4" /> Buscar
          </Button>
        </div>
        {estado === "compartido" && (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" /> Tu ubicación se compartió con el código {codigo.toUpperCase()}.
          </p>
        )}
      </Card>

      {balizas.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{balizas.length} familiar(es) localizados</p>
            <button onClick={() => refrescar()} className="inline-flex items-center gap-1 text-xs text-primary">
              <RefreshCw className="size-3.5" /> Actualizar
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="h-56">
              <MapView
                centros={balizas.map((b) => ({
                  id: b.id,
                  nombre: b.nombre,
                  fotos: [],
                  direccion: b.mensaje ?? "Ubicación compartida",
                  ciudad: "",
                  contactoCentro: "",
                  ubicacion: b.ubicacion,
                  necesita: [],
                  sobra: [],
                  estado: "aprobado" as const,
                  creadoEn: b.actualizadoEn,
                }))}
                miUbicacion={miPunto}
                enfocar={balizas[0]?.ubicacion}
              />
            </div>
          </div>
          <ul className="mt-2 space-y-2">
            {balizas.map((b) => (
              <li key={b.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                <MapPin className="size-4 text-[var(--sec-prevencion)]" />
                <span className="font-medium">{b.nombre}</span>
                {b.mensaje && <span className="text-muted">— {b.mensaje}</span>}
                <span className="ml-auto text-xs text-muted-2">
                  {new Date(b.actualizadoEn).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {balizas.length === 0 && estado === "compartido" && (
        <div className="mt-4">
          <EmptyState titulo="Aún no hay otros familiares" detalle="Comparte el código con ellos para que también publiquen su ubicación." />
        </div>
      )}
    </section>
  );
}
