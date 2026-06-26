"use client";

import { useEffect, useState } from "react";
import {
  LifeBuoy,
  Phone,
  MapPin,
  Plus,
  Users,
  CheckCircle2,
  Crosshair,
  AlertTriangle,
} from "lucide-react";
import {
  listarRescates,
  crearRescate,
  marcarRescateResuelto,
  nuevoId,
} from "@/lib/db";
import type { GeoPunto, Rescate } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Textarea,
  SectionHeader,
  Spinner,
} from "@/components/ui";

export default function RescatePage() {
  const [items, setItems] = useState<Rescate[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  async function recargar() {
    setItems(await listarRescates());
    setCargando(false);
  }
  useEffect(() => {
    recargar();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const pendientes = items.filter((r) => !r.resuelto).length;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="px-4 pb-10 pt-4">
      <SectionHeader
        titulo="Solicitudes de rescate"
        descripcion="Para personas atrapadas donde aún no llegan los servicios de ayuda."
        icon={<LifeBuoy className="size-5" />}
        color="var(--sec-rescate)"
      />

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
        <AlertTriangle className="size-5 shrink-0" />
        <p>
          Si hay una emergencia inmediata, llama también a los cuerpos de emergencia (171 / Bomberos).
        </p>
      </div>

      <Button
        full
        size="lg"
        variant={mostrarForm ? "secondary" : "danger"}
        className="mt-4"
        onClick={() => setMostrarForm((v) => !v)}
      >
        <Plus className="size-5" /> {mostrarForm ? "Cerrar formulario" : "Reportar persona atrapada"}
      </Button>

      {mostrarForm && <FormRescate onCreado={() => { setMostrarForm(false); recargar(); }} />}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display font-bold">Reportes</h2>
        <Badge tono={pendientes > 0 ? "danger" : "success"}>{pendientes} sin resolver</Badge>
      </div>

      {cargando ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon={<LifeBuoy className="size-8" />} titulo="Sin reportes" detalle="No hay solicitudes de rescate." />
        </div>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {paginatedItems.map((r) => (
              <Card key={r.id} className={r.resuelto ? "p-4 opacity-70" : "p-4"}>
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-center gap-1.5 font-medium">
                    <MapPin className="size-4 shrink-0 text-danger" /> {r.direccion}
                  </p>
                  <Badge tono={r.resuelto ? "success" : "danger"}>
                    {r.resuelto ? "Resuelto" : "Activo"}
                  </Badge>
                </div>
                {r.detalle && <p className="mt-1.5 text-sm text-muted">{r.detalle}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
                  {typeof r.personasAtrapadas === "number" && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-4" /> {r.personasAtrapadas} persona(s)
                    </span>
                  )}
                  <span>Reporta: {r.representante}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <a href={`tel:${r.telefono}`} className="flex-1">
                    <Button full variant="secondary" size="sm">
                      <Phone className="size-4" /> {r.telefono}
                    </Button>
                  </a>
                  <Button
                    size="sm"
                    variant={r.resuelto ? "ghost" : "primary"}
                    onClick={() => marcarRescateResuelto(r.id, !r.resuelto).then(recargar)}
                  >
                    <CheckCircle2 className="size-4" />
                    {r.resuelto ? "Reabrir" : "Marcar resuelto"}
                  </Button>
                </div>
              </Card>
            ))}
          </ul>
          
          {items.length > 0 && (
            <div className="mt-6 flex flex-col items-center justify-center gap-4 border-t border-border/10 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted">Mostrar:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="rounded-lg bg-surface px-2 py-1.5 text-sm font-medium text-foreground clay-inset focus:outline-none focus:ring-2 focus:ring-primary/45"
                >
                  <option value={15}>15 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                </select>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium disabled:opacity-50 clay-btn active:scale-95 transition-transform"
                >
                  Anterior
                </button>
                <span className="text-sm font-medium text-muted min-w-[80px] text-center">
                  {currentPage} / {totalPages > 0 ? totalPages : 1}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium disabled:opacity-50 clay-btn active:scale-95 transition-transform"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FormRescate({ onCreado }: { onCreado: () => void }) {
  const [direccion, setDireccion] = useState("");
  const [representante, setRepresentante] = useState("");
  const [telefono, setTelefono] = useState("");
  const [detalle, setDetalle] = useState("");
  const [personas, setPersonas] = useState("");
  const [punto, setPunto] = useState<GeoPunto | null>(null);
  const [guardando, setGuardando] = useState(false);

  const valido = direccion.trim() && representante.trim() && telefono.trim();

  function ubicar() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) =>
      setPunto({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    );
  }

  async function guardar() {
    if (!valido) return;
    setGuardando(true);
    try {
      await crearRescate({
        id: nuevoId(),
        direccion: direccion.trim(),
        representante: representante.trim(),
        telefono: telefono.trim(),
        detalle: detalle.trim() || undefined,
        personasAtrapadas: personas ? parseInt(personas, 10) : undefined,
        ubicacion: punto ?? undefined,
        resuelto: false,
        creadoEn: Date.now(),
      });
      onCreado();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card className="mt-4 space-y-3 p-4">
      <Field label="Dirección o ubicación" required>
        <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Sector, calle, casa…" />
      </Field>
      <Field label="¿Quién reporta / representa?" required>
        <Input value={representante} onChange={(e) => setRepresentante(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Teléfono" required>
          <Input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+58 …" />
        </Field>
        <Field label="Personas atrapadas">
          <Input type="number" inputMode="numeric" min={0} value={personas} onChange={(e) => setPersonas(e.target.value)} />
        </Field>
      </div>
      <Field label="Detalle de la situación">
        <Textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Estado de las personas, accesos bloqueados…" />
      </Field>
      <button
        type="button"
        onClick={ubicar}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--sec-rescate)]"
      >
        <Crosshair className="size-4" />
        {punto ? `Ubicación adjunta (${punto.lat.toFixed(4)}, ${punto.lng.toFixed(4)})` : "Adjuntar mi ubicación GPS"}
      </button>
      <Button full variant="danger" onClick={guardar} cargando={guardando} disabled={!valido}>
        Enviar solicitud de rescate
      </Button>
    </Card>
  );
}
