"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  HeartPulse,
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
} from "lucide-react";
import {
  listarRegistrosMedicos,
  crearRegistroMedico,
  eliminarRegistroMedico,
  listarMedicamentos,
  crearMedicamento,
  eliminarMedicamento,
  ajustarCantidadMedicamento,
  nuevoId,
} from "@/lib/db";
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
        icon={<HeartPulse className="size-5" />}
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
  const { usuario, iniciarSesion } = useAuth();

  async function recargar() {
    setItems(await listarRegistrosMedicos());
    setCargando(false);
  }
  useEffect(() => {
    recargar();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [q, limite]);

  const filtrados = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return items;
    return items.filter((p) => {
      const parts = [p.nombre, p.cedula, p.ciudad, p.municipio, p.parroquia, p.direccion, p.telefono];
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
        <UserPlus className="size-4" /> {mostrarForm ? "Cerrar formulario" : "Registrar persona con tratamiento"}
      </Button>

      {mostrarForm && usuario && <FormPersona creadorEmail={usuario.email} onCreado={() => { setMostrarForm(false); recargar(); }} />}

      <div className="mt-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, cédula, ciudad, patología o medicamento…"
          className="h-12 w-full rounded-xl border border-border bg-surface pl-9 pr-4 text-[15px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {cargando ? (
        <Spinner />
      ) : filtrados.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<HeartPulse className="size-8" />}
            titulo="Sin registros"
            detalle={q ? "No se encontraron resultados para tu búsqueda." : "Registra personas que requieren un tratamiento continuo para coordinar ayuda."}
          />
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {paginados.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold">
                  {p.nombre} {p.edad ? <span className="text-sm font-normal text-muted">· {p.edad} años</span> : null}
                </p>
                <Badge tono="info">{p.ciudad}</Badge>
              </div>
              {(p.municipio || p.parroquia || p.direccion) && (
                <p className="mt-1 text-xs text-muted">
                  {[p.municipio, p.parroquia].filter(Boolean).join(", ")}
                  {p.direccion ? ` · ${p.direccion}` : ""}
                </p>
              )}
              <div className="mt-2 space-y-3">
                {p.condicionesMedicas ? (
                  p.condicionesMedicas.map((c, i) => (
                    <div key={i} className="rounded bg-surface-2/30 p-2">
                      <p className="text-sm font-medium">Enfermedad: {c.patologia}</p>
                      <ul className="mt-1 list-inside list-disc pl-1">
                        {c.medicamentos.map((m, j) => (
                          <li key={j} className="text-sm">
                            <span className="font-medium text-muted">Usa:</span> {m.nombre}
                            {m.posologia ? <span className="text-muted"> ({m.posologia})</span> : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="rounded bg-surface-2/30 p-2">
                      <p className="text-sm font-medium">Enfermedad: {p.patologia}</p>
                      <ul className="mt-1 list-inside list-disc pl-1">
                        <li className="text-sm">
                          <span className="font-medium text-muted">Usa:</span> {p.tratamiento}
                          {p.posologia ? <span className="text-muted"> ({p.posologia})</span> : ""}
                        </li>
                      </ul>
                    </div>
                    {p.tratamientosAdicionales?.map((t, i) => (
                      <div key={i} className="rounded bg-surface-2/30 p-2">
                        <p className="text-sm font-medium">Enfermedad: {t.patologia}</p>
                        <ul className="mt-1 list-inside list-disc pl-1">
                          <li className="text-sm">
                            <span className="font-medium text-muted">Usa:</span> {t.tratamiento}
                            {t.posologia ? <span className="text-muted"> ({t.posologia})</span> : ""}
                          </li>
                        </ul>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <a href={`tel:${p.telefono}`} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--sec-medicos)]">
                  <Phone className="size-3.5" /> {p.telefono}
                </a>
                {usuario && usuario.email === p.creadorEmail && (
                  <button
                    onClick={() => {
                      if (confirm("¿Estás seguro de que deseas eliminar este registro?")) {
                        eliminarRegistroMedico(p.id).then(recargar);
                      }
                    }}
                    className="text-xs text-danger hover:underline"
                  >
                    Eliminar publicación
                  </button>
                )}
              </div>
            </Card>
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

  const valido =
    nombre.trim() &&
    ciudad.trim() &&
    municipio.trim() &&
    parroquia.trim() &&
    telefono.trim() &&
    condiciones.every((c) => c.patologia.trim() && c.medicamentos.every(m => m.nombre.trim()));

  async function guardar() {
    if (!valido) return;
    setGuardando(true);
    try {
      await crearRegistroMedico({
        id: nuevoId(),
        nombre: nombre.trim(),
        edad: edad ? parseInt(edad, 10) : undefined,
        cedula: cedula.trim() || undefined,
        patologia: condiciones[0].patologia.trim(),
        tratamiento: condiciones[0].medicamentos[0].nombre.trim(),
        posologia: condiciones[0].medicamentos[0].posologia?.trim() || undefined,
        condicionesMedicas: condiciones.map(c => ({
          patologia: c.patologia.trim(),
          medicamentos: c.medicamentos.map(m => ({
            nombre: m.nombre.trim(),
            posologia: m.posologia?.trim() || undefined,
          }))
        })),
        ciudad: ciudad.trim(),
        municipio: municipio.trim(),
        parroquia: parroquia.trim(),
        direccion: direccion.trim() || undefined,
        telefono: telefono.trim(),
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
      <div className="space-y-4 rounded-xl border border-border p-4 bg-surface-2/30">
        {condiciones.map((c, i) => (
          <div key={i} className="relative space-y-3 rounded-lg border border-border bg-surface p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <Field label={i === 0 ? "Patología / enfermedad" : `Patología adicional ${i + 1}`} required>
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
                  <Field label={j === 0 ? "Medicamento (presentación / mg)" : `Medicamento ${j + 1} (presentación / mg)`} required>
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
                <Plus className="size-4 mr-1" /> Añadir otro medicamento
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          full
          onClick={() => setCondiciones((prev) => [...prev, { patologia: "", medicamentos: [{ nombre: "", posologia: "" }] }])}
        >
          <Plus className="size-4 mr-1" /> Añadir otra patología
        </Button>
      </div>
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
      <Field label="Teléfono" required>
        <Input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+58 …" />
      </Field>
      <Button full onClick={guardar} cargando={guardando} disabled={!valido}>
        Guardar registro
      </Button>
    </Card>
  );
}
