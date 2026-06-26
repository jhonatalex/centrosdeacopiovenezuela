"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Plus,
  LocateFixed,
  Search,
  Star,
  MapPin,
  Loader2,
  Building2,
  LifeBuoy,
  HeartPulse,
  ShieldAlert,
  PackageCheck,
} from "lucide-react";
import { listarCentrosAprobados, listarRescates, listarRegistrosMedicos } from "@/lib/db";
import type { Centro, GeoPunto, Rescate } from "@/lib/types";
import type { HospitalMarker } from "@/components/MapView";
import { Badge, cx } from "@/components/ui";
import Footer from "@/components/Footer";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-surface-2 text-muted">
      <Loader2 className="size-6 animate-spin" />
    </div>
  ),
});

const acciones = [
  { href: "/registrar", label: "Registrar centro", icon: Building2, color: "var(--sec-acopio)" },
  { href: "/rescate", label: "Pedir rescate", icon: LifeBuoy, color: "var(--sec-rescate)" },
  { href: "/medicos", label: "Asistencia Médica", icon: HeartPulse, color: "var(--sec-medicos)" },
  { href: "/prevencion", label: "Prevención", icon: ShieldAlert, color: "var(--sec-prevencion)" },
];

export default function HomePage() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [rescates, setRescates] = useState<Rescate[]>([]);
  const [hospitales, setHospitales] = useState<HospitalMarker[]>([]);
  const [hospitalizados, setHospitalizados] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [verHospitales, setVerHospitales] = useState(true);
  const [miUbicacion, setMiUbicacion] = useState<GeoPunto | null>(null);
  const [enfocar, setEnfocar] = useState<GeoPunto | null>(null);
  const [localizando, setLocalizando] = useState(false);

  useEffect(() => {
    Promise.all([listarCentrosAprobados(), listarRescates(), listarRegistrosMedicos()])
      .then(([c, r, medicos]) => {
        setCentros(c);
        setRescates(r);
        // Agrupa pacientes hospitalizados (con ubicación) por hospital → marcadores.
        const map = new Map<string, HospitalMarker>();
        for (const p of medicos) {
          if (!p.hospitalizado || !p.hospital || !p.ubicacion) continue;
          const key = p.hospital.trim();
          const ex = map.get(key);
          if (ex) ex.pacientes += 1;
          else map.set(key, { nombre: key, ubicacion: p.ubicacion, pacientes: 1 });
        }
        setHospitales([...map.values()].sort((a, b) => b.pacientes - a.pacientes));
        setHospitalizados(medicos.filter((p) => p.hospitalizado).length);
      })
      .finally(() => setCargando(false));
  }, []);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return centros;
    return centros.filter((c) =>
      [c.nombre, c.ciudad, c.zona, ...c.necesita, ...c.sobra]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(t)),
    );
  }, [centros, q]);

  const urgentes = useMemo(() => centros.filter((c) => c.necesita.length > 0), [centros]);
  const rescatesActivos = rescates.filter((r) => !r.resuelto).length;

  function localizar() {
    if (!navigator.geolocation) return;
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMiUbicacion(p);
        setEnfocar(p);
        setLocalizando(false);
      },
      () => setLocalizando(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-5 px-4 pb-10 pt-4">
      {/* Hero + estadísticas */}
      <section className="relative overflow-hidden rounded-[1.85rem] bg-surface clay p-5">
        <div
          className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full opacity-50 blur-2xl"
          style={{ background: "var(--primary-soft)" }}
        />
        <p className="font-display text-sm font-semibold text-primary-strong">Hola 👋</p>
        <h1 className="mt-0.5 font-display text-[1.7rem] font-bold leading-tight text-foreground">
          Juntos en la emergencia
        </h1>
        <p className="mt-1 text-sm text-muted">
          Encuentra centros de acopio, dona lo que sobra y pide lo que necesitas.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Stat valor={centros.length} label="Centros activos" color="var(--sec-acopio)" />
          <Stat valor={hospitalizados} label="Hospitalizados" color="var(--sec-medicos)" />
          <Stat valor={urgentes.length} label="Piden ayuda" color="var(--sec-prevencion)" />
          <Stat valor={rescatesActivos} label="Rescates" color="var(--sec-rescate)" />
        </div>
      </section>

      {/* Acciones rápidas */}
      <section className="grid grid-cols-2 gap-3">
        {acciones.map(({ href, label, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-[1.4rem] bg-surface p-3.5 clay-sm transition-transform active:scale-[0.97]"
          >
            <span
              className="grid size-11 shrink-0 place-items-center rounded-[1rem] text-white clay-btn"
              style={{ background: color }}
            >
              <Icon className="size-5" />
            </span>
            <span className="font-display text-sm font-semibold leading-tight">{label}</span>
          </Link>
        ))}
      </section>

      {/* Mapa */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-lg font-bold">Mapa</h2>
          <span className="text-xs font-medium text-muted">
            {cargando ? "Cargando…" : `${filtrados.length} centros · ${hospitales.length} hospitales`}
          </span>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ciudad, zona o suministro…"
            className="h-12 w-full rounded-2xl bg-surface pl-10 pr-4 text-sm clay-inset placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-primary/45"
          />
        </div>

        {/* Leyenda / toggle de hospitales */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium clay-sm">
            <span className="size-2.5 rounded-full bg-[var(--sec-acopio)]" /> Centros de acopio
          </span>
          <button
            onClick={() => setVerHospitales((v) => !v)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all clay-sm",
              verHospitales ? "bg-surface text-foreground" : "bg-surface-2 text-muted-2",
            )}
          >
            <span className="size-2.5 rounded-full bg-[var(--sec-medicos)]" /> Hospitales
            {verHospitales ? " ✓" : ""}
          </button>
        </div>

        <div className="relative h-[46vh] min-h-[300px] overflow-hidden rounded-[1.75rem] clay">
          <MapView
            centros={filtrados}
            hospitales={verHospitales ? hospitales : []}
            miUbicacion={miUbicacion}
            enfocar={enfocar}
            className="z-0"
          />
          <button
            onClick={localizar}
            aria-label="Mi ubicación"
            className="absolute bottom-4 right-4 z-[600] grid size-12 place-items-center rounded-full bg-surface text-primary clay-float active:scale-95"
          >
            {localizando ? <Loader2 className="size-5 animate-spin" /> : <LocateFixed className="size-5" />}
          </button>
        </div>
      </section>

      {/* Necesidades urgentes */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <PackageCheck className="size-5 text-[var(--sec-prevencion)]" />
          <h2 className="font-display text-lg font-bold">Necesitan ayuda urgente</h2>
        </div>

        {cargando ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : urgentes.length === 0 ? (
          <p className="rounded-2xl bg-surface p-4 text-sm text-muted clay-sm">
            Ningún centro tiene necesidades urgentes registradas ahora mismo.
          </p>
        ) : (
          <ul className="space-y-3">
            {urgentes.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/centro?id=${c.id}`}
                  className="block rounded-[1.5rem] bg-surface p-4 clay-sm transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-foreground">{c.nombre}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <MapPin className="size-3.5" />
                        {c.zona ? `${c.zona}, ` : ""}
                        {c.ciudad}
                      </p>
                    </div>
                    {c.ratingCount ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm">
                        <Star className="size-4 fill-accent text-accent" />
                        {c.ratingProm}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {c.necesita.slice(0, 3).map((n) => (
                      <Badge key={n} tono="danger">
                        {n}
                      </Badge>
                    ))}
                    {c.sobra.slice(0, 2).map((s) => (
                      <Badge key={s} tono="success">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* CTA registrar */}
      <Link
        href="/registrar"
        className="flex items-center justify-between gap-2 rounded-[1.6rem] bg-primary p-5 text-on-primary clay-btn transition-transform active:scale-[0.98]"
      >
        <span>
          <span className="font-display text-lg font-bold">¿Conoces un centro de acopio?</span>
          <span className="mt-0.5 block text-sm opacity-90">Regístralo para que aparezca en el mapa.</span>
        </span>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/25">
          <Plus className="size-6" />
        </span>
      </Link>

      <Footer />
    </div>
  );
}

function Stat({ valor, label, color }: { valor: number; label: string; color: string }) {
  return (
    <div className="rounded-[1.2rem] bg-surface-2 px-2 py-3 text-center clay-inset">
      <p className="font-display text-2xl font-bold leading-none" style={{ color }}>
        {valor}
      </p>
      <p className="mt-1 text-[11px] font-medium leading-tight text-muted">{label}</p>
    </div>
  );
}
