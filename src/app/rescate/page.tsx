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
  Search,
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
  Paginator,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Textarea,
  SectionHeader,
  Spinner,
  cx,
} from "@/components/ui";

interface Desaparecido {
  id: string;
  status: string;
  nombre: string;
  cedula?: string;
  genero?: string;
  edad?: number;
  ciudad?: string;
  zona?: string;
  ultima_vez?: string;
  descripcion?: string;
  foto_url?: string;
  origen?: string;
  verificado: boolean;
  created_at: string;
  ficha_url: string;
}

export default function RescatePage() {
  const [items, setItems] = useState<Rescate[]>([]);
  const [desaparecidos, setDesaparecidos] = useState<Desaparecido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoDesaparecidos, setCargandoDesaparecidos] = useState(true);
  const [desaparecidosLimit, setDesaparecidosLimit] = useState(10);
  const [desaparecidosOffset, setDesaparecidosOffset] = useState(0);
  const [totalDesaparecidos, setTotalDesaparecidos] = useState(0);
  const [currentPageDesaparecidos, setCurrentPageDesaparecidos] = useState(1);
  const [hasMoreDesaparecidos, setHasMoreDesaparecidos] = useState(true);
  const [tab, setTab] = useState<"rescates" | "desaparecidos">("rescates");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [qDesaparecidos, setQDesaparecidos] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(qDesaparecidos);
    }, 400);
    return () => clearTimeout(handler);
  }, [qDesaparecidos]);

  async function recargar() {
    setItems(await listarRescates(500));
    setCargando(false);
  }

  async function cargarDesaparecidos(reset = false) {
    if (reset) {
      setCargandoDesaparecidos(true);
    }
    const offset = reset ? 0 : desaparecidosOffset;
    try {
      const qParam = debouncedQ ? `&q=${encodeURIComponent(debouncedQ.trim())}` : "";
      const res = await fetch(`https://venezuelareporta.org/api/v1/personas?status=buscando&limit=${Math.max(100, desaparecidosLimit)}&offset=${offset}${qParam}`);
      const data = await res.json();
      if (data.ok && data.personas) {
        if (reset) {
          setDesaparecidos(data.personas);
        } else {
          setDesaparecidos((prev) => [...prev, ...data.personas]);
        }

        setTotalDesaparecidos(data.total || data.personas.length);

        if (data.personas.length < Math.max(100, desaparecidosLimit)) {
          setHasMoreDesaparecidos(false);
        } else {
          setHasMoreDesaparecidos(true);
        }
        setDesaparecidosOffset(offset + data.personas.length);
      }
    } catch (error) {
      console.error("Error al cargar desaparecidos:", error);
    }
    setCargandoDesaparecidos(false);
  }

  useEffect(() => {
    recargar();
  }, []);

  useEffect(() => {
    setCurrentPageDesaparecidos(1);
    cargarDesaparecidos(true);
  }, [desaparecidosLimit, debouncedQ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const pendientes = items.filter((r) => !r.resuelto).length;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPagesDesaparecidos = Math.ceil(totalDesaparecidos / desaparecidosLimit) || 1;
  const paginadosDesaparecidos = desaparecidos.slice(
    (currentPageDesaparecidos - 1) * desaparecidosLimit,
    currentPageDesaparecidos * desaparecidosLimit
  );

  async function handlePageChangeDesaparecidos(nextP: number) {
    if (nextP > currentPageDesaparecidos) {
      const itemsNeeded = nextP * desaparecidosLimit;
      if (itemsNeeded > desaparecidos.length && hasMoreDesaparecidos) {
        await cargarDesaparecidos(false);
      }
    }
    setCurrentPageDesaparecidos(nextP);
  }

  return (
    <div className="px-4 pb-10 pt-4">
      <SectionHeader
        titulo="Rescates y Desaparecidos"
        descripcion="Personas atrapadas o desaparecidas reportadas por la comunidad."
        icon={<LifeBuoy className="size-5" />}
        color="var(--sec-rescate)"
      />

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
        <button
          onClick={() => setTab("rescates")}
          className={cx(
            "flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] sm:text-sm font-semibold transition-all",
            tab === "rescates" ? "bg-[var(--sec-rescate)] text-white shadow-sm" : "text-muted hover:text-foreground",
          )}
        >
          Rescates Locales
        </button>
        <button
          onClick={() => setTab("desaparecidos")}
          className={cx(
            "flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] sm:text-sm font-semibold transition-all",
            tab === "desaparecidos" ? "bg-[var(--sec-rescate)] text-white shadow-sm" : "text-muted hover:text-foreground",
          )}
        >
          Desaparecidos
        </button>
      </div>

      {tab === "rescates" && (
        <>
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
                <Paginator
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              )}
            </>
          )}
        </>
      )}

      {tab === "desaparecidos" && (
        <div className="mt-4">
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">
            <p>
              Estos datos provienen del registro público de <strong>Venezuela Reporta</strong>.
            </p>
          </div>

          <div className="mb-4 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={qDesaparecidos}
              onChange={(e) => setQDesaparecidos(e.target.value)}
              placeholder="Buscar por nombre, cédula o zona..."
              className="h-12 w-full rounded-xl border border-border bg-surface pl-9 pr-4 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {cargandoDesaparecidos && desaparecidos.length === 0 ? (
            <Spinner />
          ) : desaparecidos.length === 0 ? (
            <EmptyState icon={<Users className="size-8" />} titulo="Sin resultados" detalle="No hay personas reportadas en este momento." />
          ) : (
            <>
              <ul className="space-y-3">
                {paginadosDesaparecidos.map((d) => (
                  <Card key={d.id} className="p-4">
                    <div className="flex items-start gap-3">
                      {d.foto_url ? (
                        <img src={d.foto_url} alt={d.nombre} className="size-16 rounded-xl object-cover shrink-0 bg-surface-2" />
                      ) : (
                        <div className="size-16 rounded-xl bg-surface-2 flex items-center justify-center shrink-0">
                          <Users className="size-6 text-muted" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-foreground text-base truncate">{d.nombre}</p>
                        <p className="text-xs text-muted flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                          {d.genero && <span>{d.genero}</span>}
                          {d.edad && <span>{d.edad} años</span>}
                          {d.cedula && <span>{d.cedula}</span>}
                        </p>
                        <p className="text-sm text-foreground mt-1.5 flex flex-wrap gap-1">
                          <MapPin className="size-4 shrink-0 text-muted" />
                          {d.zona && <span>{d.zona},</span>} {d.ciudad}
                        </p>
                        {d.ultima_vez && (
                          <p className="text-xs text-muted mt-1 italic line-clamp-2">"Visto: {d.ultima_vez}"</p>
                        )}
                      </div>
                    </div>
                    <a href={d.ficha_url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                      <Button full variant="secondary" size="sm">
                        Ver ficha en Venezuela Reporta
                      </Button>
                    </a>
                  </Card>
                ))}
              </ul>

              <Paginator
                currentPage={currentPageDesaparecidos}
                totalPages={totalPagesDesaparecidos}
                onPageChange={handlePageChangeDesaparecidos}
                itemsPerPage={desaparecidosLimit}
                onItemsPerPageChange={setDesaparecidosLimit}
                options={[10, 20, 50]}
                cargando={cargandoDesaparecidos}
              />
            </>
          )}
        </div>
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
