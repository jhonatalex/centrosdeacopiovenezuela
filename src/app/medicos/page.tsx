"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  HeartPulse,
  Paperclip,
  Pill,
  Mic,
  MicOff,
  Plus,
  Minus,
  MapPin,
  Phone,
  Search,
  UserPlus,
  CheckCircle2,
  Trash2,
  Hospital,
  Camera,
  X,
  ChevronRight,
  Loader2,
  ExternalLink,
  Download,
} from "lucide-react";
import {
  listarRegistrosMedicos,
  crearRegistroMedico,
  eliminarRegistroMedico,
  eliminarRegistrosMedicos,
  importarRegistrosMedicos,
  listarMedicamentos,
  crearMedicamento,
  eliminarMedicamento,
  ajustarCantidadMedicamento,
  subirFoto,
  nuevoId,
} from "@/lib/db";
import { fetchPersonasVR, filtrarNuevos, mapearPersonaVR, detectarYFusionarDuplicados } from "@/lib/venezuelaReporta";
import { fileADataUrl } from "@/lib/img";
import { useAuth } from "@/lib/auth";
import type { Medicamento, RegistroMedico } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  SectionHeader,
  Spinner,
  cx,
} from "@/components/ui";

type Tab = "banco" | "personas";

export default function MedicosPage() {
  const [tab, setTab] = useState<Tab>("banco");
  return (
    <div className="px-4 pb-10 pt-4">
      <SectionHeader
        titulo="Tratamientos médicos"
        descripcion="Banco de medicamentos para donar y registro de personas con tratamiento."
        icon={<Activity className="size-5" />}
        color="var(--sec-medicos)"
      />
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
        <button
          onClick={() => setTab("banco")}
          className={cx(
            "flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-colors",
            tab === "banco" ? "bg-surface text-foreground shadow-card" : "text-muted",
          )}
        >
          <Pill className="size-4" /> Medicamentos
        </button>
        <button
          onClick={() => setTab("personas")}
          className={cx(
            "flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-colors",
            tab === "personas" ? "bg-surface text-foreground shadow-card" : "text-muted",
          )}
        >
          <HeartPulse className="size-4" /> Personas
        </button>
      </div>

      {tab === "banco" ? <BancoMedicamentos /> : <RegistroPersonas />}
    </div>
  );
}

/* ============================ Banco de medicamentos ============================ */

function BancoMedicamentos() {
  const [items, setItems] = useState<Medicamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [soportaVoz, setSoportaVoz] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(15);
  const recRef = useRef<unknown>(null);
  const { usuario, iniciarSesion } = useAuth();

  async function recargar() {
    setItems(await listarMedicamentos());
    setCargando(false);
  }
  useEffect(() => {
    recargar();
    const SR =
      (typeof window !== "undefined" &&
        ((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)) ||
      null;
    setSoportaVoz(Boolean(SR));
  }, []);

  function buscarPorVoz() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "es-VE";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setEscuchando(true);
    rec.onend = () => setEscuchando(false);
    rec.onerror = () => setEscuchando(false);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setQ(t.replace(/[.?¿!¡]/g, "").trim());
    };
    rec.start();
  }

  useEffect(() => {
    setPagina(1);
  }, [q, limite]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((m) =>
      [m.nombre, m.presentacion, m.ciudad, m.ubicacionTexto, m.municipio, m.parroquia, m.direccion].filter(Boolean).some((s) =>
        s!.toLowerCase().includes(t),
      ),
    );
  }, [items, q]);

  const totalPaginas = Math.ceil(filtrados.length / limite) || 1;
  const paginados = filtrados.slice((pagina - 1) * limite, pagina * limite);

  const total = items.reduce((s, m) => s + m.cantidad, 0);

  return (
    <div className="mt-5">
      {/* Buscador con voz */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar medicamento…"
            className="h-12 w-full rounded-xl border border-border bg-surface pl-9 pr-4 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {soportaVoz && (
          <button
            onClick={escuchando ? undefined : buscarPorVoz}
            aria-label="Buscar por voz"
            className={cx(
              "grid size-12 shrink-0 place-items-center rounded-xl border transition-colors",
              escuchando
                ? "animate-pulse border-danger bg-danger text-white"
                : "border-border bg-surface text-[var(--sec-medicos)]",
            )}
          >
            {escuchando ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        )}
      </div>
      {escuchando && <p className="mt-2 text-center text-sm text-danger">🎙️ Escuchando… di el nombre del medicamento</p>}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted">
          {filtrados.length} resultado(s) · {total} unidades disponibles
        </p>
        <button
          onClick={() => {
            if (!usuario) return iniciarSesion();
            setMostrarForm((v) => !v);
          }}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-full bg-accent px-5 text-[15px] font-bold text-accent-soft shadow-lg clay-btn transition-transform active:scale-95 hover:scale-105"
        >
          <Plus className="size-[18px]" strokeWidth={2.5} /> Donar
        </button>
      </div>

      {mostrarForm && usuario && <FormMedicamento creadorEmail={usuario.email} onCreado={() => { setMostrarForm(false); recargar(); }} />}

      {cargando ? (
        <Spinner />
      ) : filtrados.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Pill className="size-8" />}
            titulo="Sin medicamentos"
            detalle={q ? "No se encontró ese medicamento en el banco." : "Aún no hay medicamentos donados."}
          />
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {paginados.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold">{m.nombre}</p>
                  {m.presentacion && <p className="text-xs text-muted">{m.presentacion}</p>}
                  <p className="mt-1.5 flex items-center gap-1 text-sm text-muted">
                    <MapPin className="size-3.5" /> 
                    <span>
                      {m.ubicacionTexto}, {m.ciudad}
                      {(m.municipio || m.parroquia) && ` · ${[m.municipio, m.parroquia].filter(Boolean).join(", ")}`}
                      {m.direccion && ` · ${m.direccion}`}
                    </span>
                  </p>
                  <a
                    href={`tel:${m.contacto}`}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--sec-medicos)]"
                  >
                    <Phone className="size-3.5" /> {m.contacto}
                  </a>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Badge tono={m.cantidad > 0 ? "info" : "neutral"}>
                    {m.cantidad > 0 ? `${m.cantidad} disp.` : "Agotado"}
                  </Badge>
                  {usuario && usuario.email === m.creadorEmail && (
                    <button
                      onClick={() => {
                        if (confirm("¿Estás seguro de que deseas eliminar este medicamento?")) {
                          eliminarMedicamento(m.id).then(recargar);
                        }
                      }}
                      className="text-xs text-danger hover:underline mt-1"
                    >
                      Eliminar publicación
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          </ul>
          
          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted">
              Mostrando {(pagina - 1) * limite + 1} - {Math.min(pagina * limite, filtrados.length)} de {filtrados.length} medicamentos
            </p>
            <div className="flex items-center gap-2">
              <select
                value={limite}
                onChange={(e) => setLimite(Number(e.target.value))}
                className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value={15}>15 por pág.</option>
                <option value={25}>25 por pág.</option>
                <option value={50}>50 por pág.</option>
              </select>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina === 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina === totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FormMedicamento({ onCreado, creadorEmail }: { onCreado: () => void; creadorEmail: string }) {
  const [medicamentos, setMedicamentos] = useState([{ nombre: "", presentacion: "", cantidad: "1" }]);
  const [ciudad, setCiudad] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [parroquia, setParroquia] = useState("");
  const [ubic, setUbic] = useState(""); // ¿Dónde retirarlo? general
  const [contacto, setContacto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const valido =
    ciudad.trim() &&
    municipio.trim() &&
    parroquia.trim() &&
    ubic.trim() &&
    contacto.trim() &&
    medicamentos.every((m) => m.nombre.trim() && Number(m.cantidad) > 0);

  async function guardar() {
    if (!valido) return;
    setGuardando(true);
    try {
      const creaciones = medicamentos.map((m) =>
        crearMedicamento({
          id: nuevoId(),
          nombre: m.nombre.trim(),
          presentacion: m.presentacion.trim() || undefined,
          cantidad: Math.max(0, parseInt(m.cantidad || "0", 10)),
          ciudad: ciudad.trim(),
          municipio: municipio.trim(),
          parroquia: parroquia.trim(),
          ubicacionTexto: ubic.trim(),
          contacto: contacto.trim(),
          creadoEn: Date.now(),
          creadorEmail,
        })
      );
      await Promise.all(creaciones);
      onCreado();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card className="mt-4 space-y-3 p-4">
      <div className="space-y-4 rounded-xl border border-border p-4 bg-surface-2/30">
        {medicamentos.map((m, i) => (
          <div key={i} className="relative space-y-3 rounded-lg border border-border bg-surface p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <Field label={i === 0 ? "Medicamento" : `Medicamento ${i + 1}`} required>
                  <Input
                    value={m.nombre}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMedicamentos((prev) => prev.map((item, idx) => (idx === i ? { ...item, nombre: val } : item)));
                    }}
                    placeholder="Amoxicilina"
                  />
                </Field>
              </div>
              {i > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMedicamentos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="mt-6 border-danger/30 text-danger hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4 mr-1" /> Eliminar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Presentación">
                <Input
                  value={m.presentacion}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMedicamentos((prev) => prev.map((item, idx) => (idx === i ? { ...item, presentacion: val } : item)));
                  }}
                  placeholder="500mg"
                />
              </Field>
              <Field label="Cantidad a donar" required>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={m.cantidad}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMedicamentos((prev) => prev.map((item, idx) => (idx === i ? { ...item, cantidad: val } : item)));
                  }}
                />
              </Field>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          full
          onClick={() => setMedicamentos((prev) => [...prev, { nombre: "", presentacion: "", cantidad: "1" }])}
        >
          <Plus className="size-4 mr-1" /> Añadir otro medicamento
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2">
        <Field label="Ciudad" required>
          <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        </Field>
        <Field label="Municipio" required>
          <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
        </Field>
        <Field label="Parroquia" required>
          <Input value={parroquia} onChange={(e) => setParroquia(e.target.value)} />
        </Field>
      </div>
      <Field label="¿Dónde retirarlo?" required>
        <Input value={ubic} onChange={(e) => setUbic(e.target.value)} placeholder="Centro de acopio, dirección, N° de casa…" />
      </Field>
      <Field label="Contacto" required>
        <Input type="tel" inputMode="tel" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="+58 …" />
      </Field>
      <Button full onClick={guardar} cargando={guardando} disabled={!valido}>
        Agregar al banco
      </Button>
    </Card>
  );
}

/* ============================ Registro de personas ============================ */

function RegistroPersonas() {
  const [items, setItems] = useState<RegistroMedico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(15);
  const [detalle, setDetalle] = useState<RegistroMedico | null>(null);
  const [escuchando, setEscuchando] = useState(false);
  const [soportaVoz, setSoportaVoz] = useState(true);
  const recRef = useRef<unknown>(null);
  // Importación Venezuela Reporta
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<{ nuevos: number; omitidos: number } | null>(null);
  // Deduplicación
  const [deduplicando, setDeduplicando] = useState(false);
  const [resultadoDedup, setResultadoDedup] = useState<{ grupos: number; eliminados: number } | null>(null);
  const { usuario, iniciarSesion } = useAuth();

  async function recargar() {
    setItems(await listarRegistrosMedicos());
    setCargando(false);
  }
  useEffect(() => {
    recargar();
    const SR =
      (typeof window !== "undefined" &&
        ((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)) ||
      null;
    setSoportaVoz(Boolean(SR));
  }, []);

  function buscarPorVoz() {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "es-VE";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setEscuchando(true);
    rec.onend = () => setEscuchando(false);
    rec.onerror = () => setEscuchando(false);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setQ(t.replace(/[.?¿!¡]/g, "").trim());
    };
    rec.start();
  }

  async function importarDesdeVR() {
    if (!usuario) return iniciarSesion();
    setImportando(true);
    setResultadoImport(null);
    try {
      let todasNuevas: ReturnType<typeof mapearPersonaVR>[] = [];
      let omitidos = 0;
      const LIMIT = 100;
      for (let offset = 0; offset < 300; offset += LIMIT) {
        const resp = await fetchPersonasVR(offset, LIMIT);
        const nuevas = filtrarNuevos(resp.personas, items);
        omitidos += resp.personas.length - nuevas.length;
        todasNuevas = [...todasNuevas, ...nuevas.map(mapearPersonaVR)];
        if (resp.personas.length < LIMIT) break;
      }
      if (todasNuevas.length > 0) {
        await importarRegistrosMedicos(todasNuevas);
        await recargar();
      }
      setResultadoImport({ nuevos: todasNuevas.length, omitidos });
    } catch (err) {
      console.error("Error importando Venezuela Reporta:", err);
      setResultadoImport({ nuevos: -1, omitidos: 0 });
    } finally {
      setImportando(false);
    }
  }

  async function deduplicar() {
    if (!usuario) return iniciarSesion();
    setDeduplicando(true);
    setResultadoDedup(null);
    try {
      const todos = await listarRegistrosMedicos();
      const { fusionados, eliminar, totalGrupos } = detectarYFusionarDuplicados(todos);
      if (eliminar.length === 0) {
        setResultadoDedup({ grupos: 0, eliminados: 0 });
        return;
      }
      // Guardar los fusionados (solo los que cambiaron)
      const actualizados = fusionados.filter((r) =>
        todos.find((t) => t.id === r.id && JSON.stringify(t) !== JSON.stringify(r))
      );
      if (actualizados.length > 0) await importarRegistrosMedicos(actualizados);
      await eliminarRegistrosMedicos(eliminar);
      await recargar();
      setResultadoDedup({ grupos: totalGrupos, eliminados: eliminar.length });
    } catch (err) {
      console.error("Error en deduplicación:", err);
      setResultadoDedup({ grupos: -1, eliminados: 0 });
    } finally {
      setDeduplicando(false);
    }
  }

  useEffect(() => {
    setPagina(1);
  }, [q, limite]);

  const filtrados = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return items;
    return items.filter((p) => {
      const parts = [p.nombre, p.cedula, p.ciudad, p.municipio, p.parroquia, p.direccion, p.telefono, p.hospital, p.area];
      if (p.condicionesMedicas) {
        for (const c of p.condicionesMedicas) {
          parts.push(c.patologia);
          for (const m of c.medicamentos) {
            parts.push(m.nombre);
          }
        }
      } else {
        parts.push(p.patologia);
        parts.push(p.tratamiento);
        p.tratamientosAdicionales?.forEach((t) => {
          parts.push(t.patologia);
          parts.push(t.tratamiento);
        });
      }
      return parts.filter(Boolean).some((val) => val!.toLowerCase().includes(text));
    });
  }, [items, q]);

  const totalPaginas = Math.ceil(filtrados.length / limite) || 1;
  const paginados = filtrados.slice((pagina - 1) * limite, pagina * limite);

  return (
    <div className="mt-5">
      <Button full variant={mostrarForm ? "secondary" : "primary"} onClick={() => {
        if (!usuario) return iniciarSesion();
        setMostrarForm((v) => !v);
      }}>
        <UserPlus className="size-4" /> {mostrarForm ? "Cerrar formulario" : "Registrar"}
      </Button>

      {mostrarForm && usuario && <FormPersona creadorEmail={usuario.email} onCreado={() => { setMostrarForm(false); recargar(); }} />}

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, cédula, hospital, ciudad o medicamento…"
            className="h-12 w-full rounded-xl border border-border bg-surface pl-9 pr-4 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {soportaVoz && (
          <button
            onClick={escuchando ? undefined : buscarPorVoz}
            aria-label="Buscar por voz"
            className={cx(
              "grid size-12 shrink-0 place-items-center rounded-xl border transition-colors",
              escuchando
                ? "animate-pulse border-danger bg-danger text-white"
                : "border-border bg-surface text-[var(--sec-medicos)]",
            )}
          >
            {escuchando ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        )}
      </div>
      {escuchando && <p className="mt-2 text-center text-sm text-danger">🎙️ Escuchando… di el nombre o diagnóstico</p>}

      {cargando ? (
        <Spinner />
      ) : filtrados.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Activity className="size-8" />}
            titulo="Sin registros"
            detalle={q ? "No se encontraron resultados para tu búsqueda." : "Registra personas que requieren un tratamiento continuo para coordinar ayuda."}
          />
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {paginados.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setDetalle(p)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left clay-sm transition-transform active:scale-[0.99]"
                >
                  {/* Avatar */}
                  <span className="size-12 shrink-0 overflow-hidden rounded-full bg-surface-2">
                    {p.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-sm font-bold text-[var(--sec-medicos)]">
                        {p.nombre.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>
                  {/* Nombre + tag */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display font-bold text-foreground">
                      {p.nombre}
                      {p.edad ? <span className="font-normal text-muted"> · {p.edad}a</span> : null}
                      {p.origenExterno === "venezuelareporta" && (
                        <span className="ml-1.5 inline-block rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">VR</span>
                      )}
                    </span>
                    {p.hospitalizado && p.hospital ? (
                      <span className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-[var(--sec-medicos)]/12 px-2 py-0.5 text-[11px] font-semibold text-[var(--sec-medicos)]">
                        <Hospital className="size-3 shrink-0" />
                        <span className="truncate">{p.hospital}</span>
                      </span>
                    ) : (
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {[p.ciudad, p.municipio].filter(Boolean).join(", ") || (p.origenExterno === "venezuelareporta" ? "Venezuela Reporta" : "Sin hospitalizar")}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-2" />
                </button>
              </li>
            ))}
          </ul>
          
          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted">
              Mostrando {(pagina - 1) * limite + 1} - {Math.min(pagina * limite, filtrados.length)} de {filtrados.length} registros
            </p>
            <div className="flex items-center gap-2">
              <select
                value={limite}
                onChange={(e) => setLimite(Number(e.target.value))}
                className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value={15}>15 por pág.</option>
                <option value={25}>25 por pág.</option>
                <option value={50}>50 por pág.</option>
              </select>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina === 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina === totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Panel: Venezuela Reporta + Deduplicación ─── */}
      {usuario && (
        <div className="mt-8 space-y-3 rounded-2xl border border-border bg-surface-2/30 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Herramientas de datos</p>

          {/* Importar Venezuela Reporta */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-sm">Importar desde Venezuela Reporta</p>
              <p className="text-xs text-muted mt-0.5">Trae personas de venezuelareporta.org. Se omiten cédulas duplicadas.</p>
            </div>
            <button
              onClick={importarDesdeVR}
              disabled={importando}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--sec-medicos)] px-4 py-2 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 hover:scale-105 disabled:opacity-60"
            >
              {importando ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {importando ? "Importando…" : "Importar"}
            </button>
          </div>
          {resultadoImport && (
            <div className={cx(
              "rounded-xl px-3 py-2 text-sm",
              resultadoImport.nuevos === -1 ? "bg-danger/10 text-danger" : "bg-success/10 text-success",
            )}>
              {resultadoImport.nuevos === -1
                ? "❌ Error al conectar con la API. Verifica tu conexión."
                : `✅ ${resultadoImport.nuevos} importada(s) · ${resultadoImport.omitidos} ya existían.`}
            </div>
          )}

          <hr className="border-border" />

          {/* Deduplicar */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-sm">Detectar y fusionar duplicados</p>
              <p className="text-xs text-muted mt-0.5">Agrupa registros con misma cédula o nombre+ciudad y los fusiona en uno con más datos.</p>
            </div>
            <button
              onClick={deduplicar}
              disabled={deduplicando}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--sec-medicos)] text-[var(--sec-medicos)] px-4 py-2 text-sm font-bold transition-transform active:scale-95 hover:scale-105 disabled:opacity-60"
            >
              {deduplicando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {deduplicando ? "Procesando…" : "Deduplicar"}
            </button>
          </div>
          {resultadoDedup && (
            <div className={cx(
              "rounded-xl px-3 py-2 text-sm",
              resultadoDedup.grupos === -1 ? "bg-danger/10 text-danger" : "bg-success/10 text-success",
            )}>
              {resultadoDedup.grupos === -1
                ? "❌ Error al procesar. Intenta de nuevo."
                : resultadoDedup.grupos === 0
                ? "✅ No se encontraron duplicados."
                : `✅ ${resultadoDedup.grupos} grupo(s) fusionados · ${resultadoDedup.eliminados} registro(s) eliminados.`}
            </div>
          )}
        </div>
      )}

      {/* Modal de detalle del paciente */}
      {detalle && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDetalle(null)}
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] bg-surface p-5 shadow-float sm:rounded-[1.75rem]"
          >
            <div className="mb-3 flex items-start gap-3">
              <span className="size-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2 clay-inset">
                {detalle.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detalle.foto} alt="" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-xl font-bold text-[var(--sec-medicos)]">
                    {detalle.nombre.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold leading-tight">{detalle.nombre}</p>
                <p className="text-xs text-muted">
                  {[detalle.edad ? `${detalle.edad} años` : "", detalle.genero, detalle.cedula]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button onClick={() => setDetalle(null)} aria-label="Cerrar" className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted">
                <X className="size-5" />
              </button>
            </div>

            {detalle.hospitalizado && detalle.hospital && (
              <div className="mb-3 rounded-xl bg-[var(--sec-medicos)]/10 p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--sec-medicos)]">
                  <Hospital className="size-4" /> {detalle.hospital}
                </p>
                {detalle.area && <p className="mt-0.5 text-xs text-muted">Área: {detalle.area}</p>}
                {detalle.estadoSalud && <p className="mt-0.5 text-xs text-muted">Estado: {detalle.estadoSalud}</p>}
              </div>
            )}

            <div className="space-y-2">
              {detalle.condicionesMedicas ? (
                detalle.condicionesMedicas.map((c, i) => (
                  <div key={i} className="rounded-xl bg-surface-2/60 p-3">
                    <p className="text-sm font-medium">Enfermedad: {c.patologia}</p>
                    <ul className="mt-1 list-inside list-disc pl-1">
                      {c.medicamentos.map((m, j) => (
                        <li key={j} className="text-sm text-muted">
                          {m.nombre}{m.posologia ? ` (${m.posologia})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-surface-2/60 p-3">
                  <p className="text-sm font-medium">Enfermedad: {detalle.patologia}</p>
                  <p className="text-sm text-muted">{detalle.tratamiento}{detalle.posologia ? ` (${detalle.posologia})` : ""}</p>
                </div>
              )}
            </div>

            {(detalle.ciudad || detalle.municipio || detalle.parroquia || detalle.direccion) && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
                <MapPin className="size-3.5 shrink-0" />
                {[detalle.ciudad, detalle.municipio, detalle.parroquia, detalle.direccion].filter(Boolean).join(", ")}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {detalle.fichaUrl && (
                <a href={detalle.fichaUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button full size="sm" variant="outline">
                    <ExternalLink className="size-4" /> Ver ficha Venezuela Reporta
                  </Button>
                </a>
              )}
              {detalle.telefono && (
                <a href={`tel:${detalle.telefono}`} className="flex-1">
                  <Button full size="sm">
                    <Phone className="size-4" /> {detalle.telefono}
                  </Button>
                </a>
              )}
              {usuario && usuario.email === detalle.creadorEmail && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-danger/40 text-danger"
                  onClick={() => {
                    if (confirm("¿Eliminar este registro?")) {
                      eliminarRegistroMedico(detalle.id).then(() => {
                        setDetalle(null);
                        recargar();
                      });
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormPersona({ onCreado, creadorEmail }: { onCreado: () => void; creadorEmail: string }) {
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [cedula, setCedula] = useState("");
  const [condiciones, setCondiciones] = useState([{ patologia: "", medicamentos: [{ nombre: "", posologia: "" }] }]);
  const [ciudad, setCiudad] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [parroquia, setParroquia] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);
  // Formulario inteligente: hospitalización + foto
  const [hospitalizado, setHospitalizado] = useState(false);
  const [hospital, setHospital] = useState("");
  const [area, setArea] = useState("");
  const [foto, setFoto] = useState("");
  const [procesandoFoto, setProcesandoFoto] = useState(false);

  const valido =
    nombre.trim() &&
    (hospitalizado || (ciudad.trim() && municipio.trim() && parroquia.trim())) &&
    telefono.trim() &&
    (!hospitalizado || hospital.trim()) &&
    condiciones.every((c) => c.patologia.trim() && (hospitalizado || c.medicamentos.every(m => m.nombre.trim())));

  async function onFoto(file: File | null) {
    if (!file) return;
    setProcesandoFoto(true);
    try {
      setFoto(await fileADataUrl(file, 800, 0.8));
    } finally {
      setProcesandoFoto(false);
    }
  }

  async function guardar() {
    if (!valido) return;
    setGuardando(true);
    try {
      const id = nuevoId();
      let fotoUrl: string | undefined;
      if (foto) fotoUrl = await subirFoto(foto, `pacientes/${id}/foto.jpg`);
      await crearRegistroMedico({
        id,
        nombre: nombre.trim(),
        edad: edad ? parseInt(edad, 10) : undefined,
        cedula: cedula.trim() || undefined,
        patologia: condiciones[0].patologia.trim(),
        tratamiento: condiciones[0].medicamentos[0].nombre.trim() || (hospitalizado ? "Sin especificar" : ""),
        posologia: condiciones[0].medicamentos[0].posologia?.trim() || undefined,
        condicionesMedicas: condiciones.map(c => ({
          patologia: c.patologia.trim(),
          medicamentos: c.medicamentos
            .filter(m => m.nombre.trim() || !hospitalizado)
            .map(m => ({
              nombre: m.nombre.trim() || "Sin especificar",
              posologia: m.posologia?.trim() || undefined,
            }))
        })),
        ciudad: ciudad.trim(),
        municipio: municipio.trim(),
        parroquia: parroquia.trim(),
        direccion: direccion.trim() || undefined,
        telefono: telefono.trim(),
        hospitalizado,
        hospital: hospitalizado ? hospital.trim() : undefined,
        area: hospitalizado && area.trim() ? area.trim() : undefined,
        foto: fotoUrl,
        creadoEn: Date.now(),
        creadorEmail,
      });
      setOk(true);
      setTimeout(onCreado, 900);
    } finally {
      setGuardando(false);
    }
  }

  if (ok)
    return (
      <Card className="mt-4 flex flex-col items-center gap-2 p-6 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <p className="font-semibold">Registro guardado</p>
      </Card>
    );

  return (
    <Card className="mt-4 space-y-3 p-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Nombres y apellidos" required>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
        </div>
        <Field label="Edad">
          <Input type="number" inputMode="numeric" value={edad} onChange={(e) => setEdad(e.target.value)} />
        </Field>
      </div>
      <Field label="Cédula / identidad">
        <Input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="V-…" />
      </Field>

      {/* Foto del paciente (opcional) */}
      <Field label="Foto del paciente (opcional)">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-surface-2 clay-inset">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-muted-2">
                <Camera className="size-6" />
              </div>
            )}
          </div>
          <div className="flex overflow-hidden rounded-full bg-surface clay-sm">
            <label className="inline-flex cursor-pointer items-center gap-1.5 px-4 py-2 text-sm font-semibold hover:bg-surface-2 transition-colors border-r border-border active:bg-surface-2">
              {procesandoFoto ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              Foto
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFoto(e.target.files?.[0] ?? null)} />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 px-4 py-2 text-sm font-semibold hover:bg-surface-2 transition-colors active:bg-surface-2">
              <Paperclip className="size-4" /> Adjuntar
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(e) => onFoto(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {foto && (
            <button type="button" onClick={() => setFoto("")} className="text-xs text-danger hover:underline">
              Quitar
            </button>
          )}
        </div>
      </Field>

      {/* Smart: ¿hospitalizado? */}
      <div className="rounded-xl border border-[var(--sec-medicos)]/30 bg-[var(--sec-medicos)]/5 p-3">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={hospitalizado}
            onChange={(e) => setHospitalizado(e.target.checked)}
            className="size-4 accent-[var(--sec-medicos)]"
          />
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Hospital className="size-4 text-[var(--sec-medicos)]" /> ¿Está hospitalizado/a?
          </span>
        </label>
        {hospitalizado && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Centro de salud / hospital" required>
              <Input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="Hospital Universitario…" />
            </Field>
            <Field label="Área de hospitalización (opcional)">
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Emergencia, Piso 3, UCI…" />
            </Field>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border border-border p-4 bg-surface-2/30">
        {condiciones.map((c, i) => (
          <div key={i} className="relative space-y-3 rounded-lg border border-border bg-surface p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <Field label={i === 0 ? "Diagnóstico" : `Diagnóstico adicional ${i + 1}`} required>
                  <Input
                    value={c.patologia}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCondiciones((prev) => prev.map((item, idx) => (idx === i ? { ...item, patologia: val } : item)));
                    }}
                    placeholder="Diabetes tipo 1"
                  />
                </Field>
              </div>
              {i > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCondiciones((prev) => prev.filter((_, idx) => idx !== i))}
                  className="mt-6 border-danger/30 text-danger hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4 mr-1" /> Eliminar enfermedad
                </Button>
              )}
            </div>
            
            <div className="space-y-3 pl-4 border-l-2 border-border/50">
              {c.medicamentos.map((m, j) => (
                <div key={j} className="grid grid-cols-2 gap-3 relative">
                  <Field label={j === 0 ? "Medicamento (presentación / mg)" : `Medicamento ${j + 1} (presentación / mg)`} required={!hospitalizado}>
                    <Input
                      value={m.nombre}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCondiciones((prev) => prev.map((item, idx) => {
                          if (idx !== i) return item;
                          const newMeds = [...item.medicamentos];
                          newMeds[j] = { ...newMeds[j], nombre: val };
                          return { ...item, medicamentos: newMeds };
                        }));
                      }}
                      placeholder="Insulina NPH diaria"
                    />
                  </Field>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Field label="Posología (Opcional)">
                        <Input
                          value={m.posologia}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCondiciones((prev) => prev.map((item, idx) => {
                              if (idx !== i) return item;
                              const newMeds = [...item.medicamentos];
                              newMeds[j] = { ...newMeds[j], posologia: val };
                              return { ...item, medicamentos: newMeds };
                            }));
                          }}
                          placeholder="Ej: 1 cada 8h"
                        />
                      </Field>
                    </div>
                    {j > 0 && (
                      <button
                        type="button"
                        className="mb-1 h-10 w-10 shrink-0 rounded-lg flex items-center justify-center bg-danger/10 text-danger hover:bg-danger/20"
                        title="Eliminar tratamiento"
                        onClick={() => {
                          setCondiciones((prev) => prev.map((item, idx) => {
                            if (idx !== i) return item;
                            return { ...item, medicamentos: item.medicamentos.filter((_, mIdx) => mIdx !== j) };
                          }));
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCondiciones((prev) => prev.map((item, idx) => {
                  if (idx !== i) return item;
                  return { ...item, medicamentos: [...item.medicamentos, { nombre: "", posologia: "" }] };
                }))}
              >
                <Plus className="size-4 mr-1" /> Añadir
              </Button>
            </div>
          </div>
        ))}
        {!hospitalizado && (
          <Button
            type="button"
            variant="secondary"
            full
            onClick={() => setCondiciones((prev) => [...prev, { patologia: "", medicamentos: [{ nombre: "", posologia: "" }] }])}
          >
            <Plus className="size-4 mr-1" /> Añadir otro diagnóstico
          </Button>
        )}
      </div>
      {!hospitalizado && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Ciudad" required>
              <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
            </Field>
            <Field label="Municipio" required>
              <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            </Field>
            <Field label="Parroquia" required>
              <Input value={parroquia} onChange={(e) => setParroquia(e.target.value)} />
            </Field>
          </div>
          <Field label="Dirección / N° de casa (Opcional)">
            <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </Field>
        </>
      )}
      <Field label="Teléfono" required>
        <Input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+58 …" />
      </Field>
      <Button full onClick={guardar} cargando={guardando} disabled={!valido}>
        Guardar registro
      </Button>
    </Card>
  );
}
