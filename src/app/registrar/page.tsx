"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Camera,
  X,
  MapPin,
  CheckCircle2,
  Building2,
  Loader2,
  ArrowLeft,
  Crosshair,
} from "lucide-react";
import { crearCentro, nuevoId, subirFoto } from "@/lib/db";
import { fileADataUrl } from "@/lib/img";
import type { Centro, GeoPunto } from "@/lib/types";
import {
  Button,
  Field,
  Input,
  Textarea,
  ChipInput,
  SectionHeader,
  cx,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const SUG_NECESITA = ["Agua potable", "Pañales", "Medicamentos", "Alimentos no perecederos", "Colchonetas", "Insulina"];
const SUG_SOBRA = ["Ropa", "Frazadas", "Útiles de aseo", "Agua", "Enlatados"];

export default function RegistrarPage() {
  const { usuario, iniciarSesion } = useAuth();
  const [fotos, setFotos] = useState<string[]>([]);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [manual, setManual] = useState(false);
  const [ciudad, setCiudad] = useState("");
  const [zona, setZona] = useState("");
  const [institucion, setInstitucion] = useState("");
  const [contacto, setContacto] = useState("");
  const [punto, setPunto] = useState<GeoPunto | null>(null);
  const [necesita, setNecesita] = useState<string[]>([]);
  const [sobra, setSobra] = useState<string[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [regNombre, setRegNombre] = useState("");
  const [regContacto, setRegContacto] = useState("");

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [procesandoFoto, setProcesandoFoto] = useState(false);

  async function onFotos(files: FileList | null) {
    if (!files) return;
    setProcesandoFoto(true);
    try {
      const restantes = 3 - fotos.length;
      const nuevas: string[] = [];
      for (const f of Array.from(files).slice(0, restantes)) {
        nuevas.push(await fileADataUrl(f));
      }
      setFotos((p) => [...p, ...nuevas].slice(0, 3));
    } finally {
      setProcesandoFoto(false);
    }
  }

  function validar() {
    const e: Record<string, string> = {};
    if (fotos.length === 0) e.fotos = "Sube al menos una foto del centro.";
    if (!nombre.trim()) e.nombre = "Indica el nombre del centro.";
    if (!direccion.trim()) e.direccion = "Indica la dirección o referencia.";
    if (!ciudad.trim()) e.ciudad = "Indica la ciudad.";
    if (!contacto.trim()) e.contacto = "Indica un número de contacto.";
    if (!punto) e.punto = "Selecciona la ubicación en el mapa.";
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function enviar() {
    if (!validar()) {
      document.getElementById("form-top")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setEnviando(true);
    try {
      const id = nuevoId();
      const urls: string[] = [];
      for (let i = 0; i < fotos.length; i++) {
        urls.push(await subirFoto(fotos[i], `centros/${id}/${i}.jpg`));
      }
      const centro: Centro = {
        id,
        nombre: nombre.trim(),
        fotos: urls,
        direccion: direccion.trim(),
        direccionManual: manual,
        ciudad: ciudad.trim(),
        zona: zona.trim() || undefined,
        institucion: institucion.trim() || undefined,
        contactoCentro: contacto.trim(),
        ubicacion: punto!,
        necesita,
        sobra,
        descripcion: descripcion.trim() || undefined,
        registradorNombre: regNombre.trim() || undefined,
        registradorContacto: regContacto.trim() || undefined,
        creadorUid: usuario?.uid,
        estado: "pendiente",
        creadoEn: Date.now(),
      };
      await crearCentro(centro);
      setListo(true);
    } finally {
      setEnviando(false);
    }
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) =>
      setPunto({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    );
  }

  if (listo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-9" />
        </div>
        <h1 className="font-display text-2xl font-bold">¡Centro enviado!</h1>
        <p className="max-w-sm text-muted">
          Gracias por ayudar. Un administrador revisará la información y, una vez aprobada,
          aparecerá en el mapa público.
        </p>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="secondary">Volver al mapa</Button>
          </Link>
          <Button
            onClick={() => {
              setListo(false);
              setFotos([]);
              setNombre("");
              setDireccion("");
              setCiudad("");
              setZona("");
              setInstitucion("");
              setContacto("");
              setPunto(null);
              setNecesita([]);
              setSobra([]);
              setDescripcion("");
              setRegNombre("");
              setRegContacto("");
            }}
          >
            Registrar otro
          </Button>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <Building2 className="size-12 text-muted" />
        <h1 className="font-display text-2xl font-bold">Inicia sesión</h1>
        <p className="max-w-sm text-muted">
          Para registrar un centro de acopio y poder administrar sus necesidades más adelante, debes iniciar sesión con tu cuenta.
        </p>
        <Button onClick={iniciarSesion}>Iniciar sesión con Google</Button>
      </div>
    );
  }

  return (
    <div id="form-top" className="px-4 pb-10 pt-4">
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <SectionHeader
        titulo="Registrar centro de acopio"
        descripcion="Será revisado por un administrador antes de publicarse."
        icon={<Building2 className="size-5" />}
      />

      <div className="mt-6 space-y-6">
        {/* Fotos */}
        <section>
          <Field
            label="Fotos del centro"
            required
            hint="Toma o sube hasta 3 fotos claras del edificio."
            error={errores.fotos}
          >
            <div className="flex flex-wrap gap-2">
              {fotos.map((f, i) => (
                <div key={i} className="relative size-24 overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotos((p) => p.filter((_, j) => j !== i))}
                    aria-label="Quitar foto"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              {fotos.length < 3 && (
                <label
                  className={cx(
                    "grid size-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border text-muted transition-colors hover:border-primary hover:text-primary",
                    procesandoFoto && "pointer-events-none opacity-60",
                  )}
                >
                  {procesandoFoto ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-[11px]">
                      <Camera className="size-6" /> Añadir
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(e) => onFotos(e.target.files)}
                  />
                </label>
              )}
            </div>
          </Field>
        </section>

        {/* Datos del centro */}
        <section className="space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            Datos del centro
          </h2>
          <Field label="Nombre del edificio / centro" required error={errores.nombre}>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Parroquia La Candelaria" />
          </Field>
          <Field label="Dirección o punto de referencia" required error={errores.direccion}>
            <Input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Av. principal, frente a…"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={manual}
              onChange={(e) => setManual(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            No encuentro la dirección — la escribiré manualmente y marcaré el punto en el mapa.
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad" required error={errores.ciudad}>
              <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Caracas" />
            </Field>
            <Field label="Zona / parroquia / sector">
              <Input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="La Candelaria" />
            </Field>
          </div>
          <Field label="Institución responsable">
            <Input
              value={institucion}
              onChange={(e) => setInstitucion(e.target.value)}
              placeholder="Cruz Roja, junta de vecinos…"
            />
          </Field>
          <Field label="Teléfono(s) de contacto del centro" required error={errores.contacto}>
            <Input
              type="tel"
              inputMode="tel"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="+58 …"
              autoComplete="tel"
            />
          </Field>
        </section>

        {/* Ubicación en mapa */}
        <section>
          <Field label="Ubicación en el mapa" required hint="Toca el mapa para colocar el marcador." error={errores.punto}>
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="h-64">
                <MapView centros={[]} onPick={setPunto} puntoElegido={punto} enfocar={punto} />
              </div>
              <div className="flex items-center justify-between gap-2 bg-surface-2 px-3 py-2 text-xs">
                <span className="flex items-center gap-1 text-muted">
                  <MapPin className="size-3.5" />
                  {punto ? `${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}` : "Sin ubicación"}
                </span>
                <button
                  type="button"
                  onClick={usarMiUbicacion}
                  className="inline-flex items-center gap-1 font-medium text-primary"
                >
                  <Crosshair className="size-3.5" /> Usar mi ubicación
                </button>
              </div>
            </div>
          </Field>
        </section>

        {/* Inventario */}
        <section className="space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">Suministros</h2>
          <Field label="¿Qué necesita con urgencia?" hint="Escribe y presiona Enter o toca una sugerencia.">
            <ChipInput
              valores={necesita}
              onChange={setNecesita}
              tono="danger"
              placeholder="Ej. agua potable"
              sugerencias={SUG_NECESITA}
            />
          </Field>
          <Field label="¿Qué puede compartir / está donando?">
            <ChipInput
              valores={sobra}
              onChange={setSobra}
              tono="success"
              placeholder="Ej. frazadas"
              sugerencias={SUG_SOBRA}
            />
          </Field>
          <Field label="Descripción o detalles">
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Horario de atención, condiciones, cómo llegar…"
            />
          </Field>
        </section>

        {/* Registrador */}
        <section className="space-y-4 rounded-2xl border border-border bg-surface-2 p-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            Tus datos (privados)
          </h2>
          <p className="-mt-2 text-xs text-muted">Solo los ve el administrador para validar el registro.</p>
          <Field label="Tu nombre">
            <Input value={regNombre} onChange={(e) => setRegNombre(e.target.value)} />
          </Field>
          <Field label="Tu contacto">
            <Input value={regContacto} onChange={(e) => setRegContacto(e.target.value)} placeholder="+58 …" />
          </Field>
        </section>

        <Button full size="lg" cargando={enviando} onClick={enviar}>
          Enviar para revisión
        </Button>
      </div>
    </div>
  );
}
