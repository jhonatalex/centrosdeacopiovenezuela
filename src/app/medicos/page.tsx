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
} from "lucide-react";
import {
  listarRegistrosMedicos,
  crearRegistroMedico,
  listarMedicamentos,
  crearMedicamento,
  ajustarCantidadMedicamento,
  nuevoId,
} from "@/lib/db";
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
  const recRef = useRef<unknown>(null);

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

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((m) =>
      [m.nombre, m.presentacion, m.ciudad, m.ubicacionTexto].filter(Boolean).some((s) =>
        s!.toLowerCase().includes(t),
      ),
    );
  }, [items, q]);

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
        <Button size="sm" variant="outline" onClick={() => setMostrarForm((v) => !v)}>
          <Plus className="size-4" /> Donar medicamento
        </Button>
      </div>

      {mostrarForm && <FormMedicamento onCreado={() => { setMostrarForm(false); recargar(); }} />}

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
        <ul className="mt-4 space-y-3">
          {filtrados.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold">{m.nombre}</p>
                  {m.presentacion && <p className="text-xs text-muted">{m.presentacion}</p>}
                  <p className="mt-1.5 flex items-center gap-1 text-sm text-muted">
                    <MapPin className="size-3.5" /> {m.ubicacionTexto}, {m.ciudad}
                  </p>
                  <a
                    href={`tel:${m.contacto}`}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--sec-medicos)]"
                  >
                    <Phone className="size-3.5" /> {m.contacto}
                  </a>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Badge tono={m.cantidad > 0 ? "info" : "neutral"}>
                    {m.cantidad > 0 ? `${m.cantidad} disp.` : "Agotado"}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Restar (entrega)"
                      onClick={() => ajustarCantidadMedicamento(m.id, -1).then(recargar)}
                      className="grid size-9 place-items-center rounded-lg border border-border text-muted hover:bg-surface-2"
                    >
                      <Minus className="size-4" />
                    </button>
                    <button
                      aria-label="Sumar (ingreso)"
                      onClick={() => ajustarCantidadMedicamento(m.id, 1).then(recargar)}
                      className="grid size-9 place-items-center rounded-lg border border-border text-muted hover:bg-surface-2"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormMedicamento({ onCreado }: { onCreado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [ciudad, setCiudad] = useState("");
  const [ubic, setUbic] = useState("");
  const [contacto, setContacto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const valido = nombre.trim() && ciudad.trim() && ubic.trim() && contacto.trim();

  async function guardar() {
    if (!valido) return;
    setGuardando(true);
    try {
      await crearMedicamento({
        id: nuevoId(),
        nombre: nombre.trim(),
        presentacion: presentacion.trim() || undefined,
        cantidad: Math.max(0, parseInt(cantidad || "0", 10)),
        ciudad: ciudad.trim(),
        ubicacionTexto: ubic.trim(),
        contacto: contacto.trim(),
        creadoEn: Date.now(),
      });
      onCreado();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card className="mt-4 space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Medicamento" required>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Amoxicilina" />
        </Field>
        <Field label="Presentación">
          <Input value={presentacion} onChange={(e) => setPresentacion(e.target.value)} placeholder="500mg" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cantidad" required>
          <Input type="number" inputMode="numeric" min={0} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </Field>
        <Field label="Ciudad" required>
          <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        </Field>
      </div>
      <Field label="¿Dónde retirarlo?" required>
        <Input value={ubic} onChange={(e) => setUbic(e.target.value)} placeholder="Centro de acopio, dirección…" />
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

  async function recargar() {
    setItems(await listarRegistrosMedicos());
    setCargando(false);
  }
  useEffect(() => {
    recargar();
  }, []);

  return (
    <div className="mt-5">
      <Button full variant={mostrarForm ? "secondary" : "primary"} onClick={() => setMostrarForm((v) => !v)}>
        <UserPlus className="size-4" /> {mostrarForm ? "Cerrar formulario" : "Registrar persona con tratamiento"}
      </Button>

      {mostrarForm && <FormPersona onCreado={() => { setMostrarForm(false); recargar(); }} />}

      {cargando ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<HeartPulse className="size-8" />}
            titulo="Sin registros"
            detalle="Registra personas que requieren un tratamiento continuo para coordinar ayuda."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold">
                  {p.nombre} {p.edad ? <span className="text-sm font-normal text-muted">· {p.edad} años</span> : null}
                </p>
                <Badge tono="info">{p.ciudad}</Badge>
              </div>
              <p className="mt-1 text-sm"><span className="font-medium">Patología:</span> {p.patologia}</p>
              <p className="text-sm"><span className="font-medium">Tratamiento:</span> {p.tratamiento}</p>
              <a href={`tel:${p.telefono}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[var(--sec-medicos)]">
                <Phone className="size-3.5" /> {p.telefono}
              </a>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormPersona({ onCreado }: { onCreado: () => void }) {
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [cedula, setCedula] = useState("");
  const [patologia, setPatologia] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  const valido = nombre.trim() && patologia.trim() && tratamiento.trim() && ciudad.trim() && telefono.trim();

  async function guardar() {
    if (!valido) return;
    setGuardando(true);
    try {
      await crearRegistroMedico({
        id: nuevoId(),
        nombre: nombre.trim(),
        edad: edad ? parseInt(edad, 10) : undefined,
        cedula: cedula.trim() || undefined,
        patologia: patologia.trim(),
        tratamiento: tratamiento.trim(),
        ciudad: ciudad.trim(),
        telefono: telefono.trim(),
        creadoEn: Date.now(),
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
          <Field label="Nombre" required>
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
      <Field label="Patología / enfermedad" required>
        <Input value={patologia} onChange={(e) => setPatologia(e.target.value)} placeholder="Diabetes tipo 1" />
      </Field>
      <Field label="Tratamiento que usa" required>
        <Input value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} placeholder="Insulina NPH diaria" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ciudad" required>
          <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        </Field>
        <Field label="Teléfono" required>
          <Input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+58 …" />
        </Field>
      </div>
      <Button full onClick={guardar} cargando={guardando} disabled={!valido}>
        Guardar registro
      </Button>
    </Card>
  );
}
