"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Key,
  Save,
  Plus,
  Trash2,
  Edit3,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  ChevronRight,
  ArrowLeft,
  Wifi,
  WifiOff,
  Check,
  LogIn,
  ShieldCheck,
  ImagePlus,
} from "lucide-react";
import {
  obtenerWhaibotConfig,
  guardarWhaibotConfig,
  listarPlantillas,
  crearPlantilla,
  actualizarPlantilla,
  eliminarPlantilla,
  listarCentros,
  nuevoId,
  subirFoto,
} from "@/lib/db";
import { fileADataUrl } from "@/lib/img";
import { useAuth } from "@/lib/auth";
import type { WhaibotConfig, WhaibotPlantilla, Centro } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
  Spinner,
  Input,
  Textarea,
  Field,
  cx,
} from "@/components/ui";

const WHAIBOT_BASE = "https://whaibot.com";

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/**
 * Normaliza un número de teléfono al formato internacional sin + requerido por WhaiBot.
 * Ej: 584141234567
 *
 * Formatos de entrada soportados:
 *   04241234567   → 584241234567  (Venezuela local: 04XX → 584XX)
 *   4121245555    → 58 + 4121245555 → si tiene 10 dígitos y empieza por 4 = VE
 *   584127575904  → 584127575904  (ya internacional)
 *   573127556115  → 573127556115  (Colombia, ya con código)
 *   +58 412-123   → 58412123      (con +, espacios y guiones)
 *   00584241234567→ 584241234567  (con prefijo 00)
 */
function normalizarNumero(tel: string): string {
  // 1. Quitar todo excepto dígitos
  let n = tel.replace(/[^\d]/g, "");

  // 2. Quitar prefijo 00
  if (n.startsWith("00")) n = n.slice(2);

  // 3. Número local venezolano: empieza con 0 (ej: 04241234567)
  if (n.startsWith("0") && n.length >= 10) n = "58" + n.slice(1);

  // 4. Número venezolano sin código de país: 10 dígitos empezando en 4
  //    (ej: 4121245555, 4247141072)
  //    Venezuela → operadoras: 412, 414, 416, 424, 426
  if (
    n.length === 10 &&
    n.startsWith("4") &&
    /^4(1[2-9]|2[4-6]|1[4-6])/.test(n)
  ) {
    n = "58" + n;
  }

  return n;
}

/** Extrae todos los números de contacto únicos de la lista de centros aprobados */
function extraerNumeros(centros: Centro[]): { numero: string; centro: string; id: string }[] {
  const vistos = new Set<string>();
  const resultado: { numero: string; centro: string; id: string }[] = [];
  for (const c of centros.filter((x) => x.estado === "aprobado")) {
    const nums = c.contactoCentro.split(",").map((n) => n.trim()).filter(Boolean);
    for (const n of nums) {
      const norm = normalizarNumero(n);
      if (norm && !vistos.has(norm)) {
        vistos.add(norm);
        resultado.push({ numero: norm, centro: c.nombre, id: c.id });
      }
    }
  }
  return resultado;
}

// ──────────────────────────────────────────────────────────
// Subcomponente: Tarjeta de plantilla
// ──────────────────────────────────────────────────────────

function PlantillaCard({
  p,
  onEditar,
  onEliminar,
  onEnviar,
}: {
  p: WhaibotPlantilla;
  onEditar: () => void;
  onEliminar: () => void;
  onEnviar: () => void;
}) {
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-sm text-foreground truncate">{p.nombre}</p>
          <p className="text-xs text-muted mt-0.5 line-clamp-2">{p.mensaje}</p>
          {p.mediaUrl && (
            <p className="text-[10px] text-primary mt-1 truncate">🖼 {p.mediaUrl}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEditar}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-foreground transition-colors"
            title="Editar"
          >
            <Edit3 className="size-3.5" />
          </button>
          <button
            onClick={onEliminar}
            className="p-1.5 rounded-lg hover:bg-danger-soft text-muted hover:text-danger transition-colors"
            title="Eliminar"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <Button size="sm" onClick={onEnviar} className="self-start">
        <Send className="size-3.5" /> Enviar a centros
      </Button>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────────────────

export default function WhaibotPage() {
  const { usuario, cargando: authCargando, iniciarSesion } = useAuth();

  // Credenciales
  const [config, setConfig] = useState<WhaibotConfig | null>(null);
  const [botId, setBotId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [mostrarApiKey, setMostrarApiKey] = useState(false);
  const [guardandoCreds, setGuardandoCreds] = useState(false);
  const [estadoBot, setEstadoBot] = useState<"idle" | "checking" | "ready" | "error">("idle");

  // Plantillas
  const [plantillas, setPlantillas] = useState<WhaibotPlantilla[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal de plantilla
  const [modalPlantilla, setModalPlantilla] = useState(false);
  const [editandoPlantilla, setEditandoPlantilla] = useState<WhaibotPlantilla | null>(null);
  const [pNombre, setPNombre] = useState("");
  const [pMensaje, setPMensaje] = useState("");
  const [pMediaUrl, setPMediaUrl] = useState("");
  const [pSubiendoImg, setPSubiendoImg] = useState(false);
  const [guardandoP, setGuardandoP] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Envío masivo
  const [plantillaEnvio, setPlantillaEnvio] = useState<WhaibotPlantilla | null>(null);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [numeros, setNumeros] = useState<{ numero: string; centro: string; id: string }[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [resultados, setResultados] = useState<{ numero: string; ok: boolean; msg: string }[]>([]);

  const recargar = useCallback(async () => {
    const [cfg, ps, cs] = await Promise.all([
      obtenerWhaibotConfig(),
      listarPlantillas(),
      listarCentros(),
    ]);
    setConfig(cfg);
    if (cfg) {
      setBotId(cfg.botId);
      setApiKey(cfg.apiKey);
    }
    setPlantillas(ps.sort((a, b) => b.creadoEn - a.creadoEn));
    setCentros(cs);
    setNumeros(extraerNumeros(cs));
    setCargando(false);
  }, []);

  useEffect(() => {
    if (usuario?.esAdmin) recargar();
  }, [usuario, recargar]);

  // ── Guardar credenciales ──
  async function guardarCredenciales() {
    if (!botId.trim() || !apiKey.trim()) return;
    setGuardandoCreds(true);
    try {
      const cfg: WhaibotConfig = { botId: botId.trim(), apiKey: apiKey.trim(), updatedAt: Date.now() };
      await guardarWhaibotConfig(cfg);
      setConfig(cfg);
    } finally {
      setGuardandoCreds(false);
    }
  }

  // ── Probar conexión del bot ──
  async function probarConexion() {
    if (!botId.trim() || !apiKey.trim()) return;
    setEstadoBot("checking");
    try {
      const res = await fetch(`${WHAIBOT_BASE}/api/health`, {
        headers: { "x-client-key": apiKey.trim(), "x-client-botid": botId.trim() },
      });
      const data = await res.json();
      setEstadoBot(data.success && data.status === "ready" ? "ready" : "error");
    } catch {
      setEstadoBot("error");
    }
  }

  // ── Modal plantilla ──
  function abrirNuevaPlantilla() {
    setEditandoPlantilla(null);
    setPNombre(""); setPMensaje(""); setPMediaUrl("");
    setModalPlantilla(true);
  }
  function abrirEditarPlantilla(p: WhaibotPlantilla) {
    setEditandoPlantilla(p);
    setPNombre(p.nombre); setPMensaje(p.mensaje); setPMediaUrl(p.mediaUrl || "");
    setModalPlantilla(true);
  }

  async function onImagenLocal(file: File | null) {
    if (!file) return;
    setPSubiendoImg(true);
    try {
      const dataUrl = await fileADataUrl(file, 1280, 0.85);
      // Sube a Firebase Storage (o devuelve dataUrl en modo demo)
      const ruta = `whaibot/plantillas/${nuevoId()}.jpg`;
      const url = await subirFoto(dataUrl, ruta);
      setPMediaUrl(url);
    } finally {
      setPSubiendoImg(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  }

  async function guardarPlantillaModal() {
    if (!pNombre.trim() || !pMensaje.trim()) return;
    setGuardandoP(true);
    try {
      const mediaUrl = pMediaUrl.trim() || undefined;
      if (editandoPlantilla) {
        await actualizarPlantilla({ ...editandoPlantilla, nombre: pNombre.trim(), mensaje: pMensaje.trim(), mediaUrl });
      } else {
        await crearPlantilla({ id: nuevoId(), nombre: pNombre.trim(), mensaje: pMensaje.trim(), mediaUrl, creadoEn: Date.now() });
      }
      setModalPlantilla(false);
      await recargar();
    } finally {
      setGuardandoP(false);
    }
  }
  async function borrarPlantilla(id: string) {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    await eliminarPlantilla(id);
    await recargar();
  }

  // ── Envío masivo ──
  function abrirEnvio(p: WhaibotPlantilla) {
    setPlantillaEnvio(p);
    setSeleccionados(new Set(numeros.map((n) => n.numero)));
    setResultados([]);
  }

  function toggleNumero(num: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  }

  async function enviarMensajes() {
    if (!config || !plantillaEnvio || seleccionados.size === 0) return;
    setEnviando(true);
    setResultados([]);
    const lista = [...seleccionados];
    const res: { numero: string; ok: boolean; msg: string }[] = [];

    for (const numero of lista) {
      // Delay entre mensajes (evitar bloqueo de WhatsApp)
      if (res.length > 0) await new Promise((r) => setTimeout(r, 1500));
      try {
        const body: Record<string, string> = {
          to: numero,
          message: plantillaEnvio.mensaje,
          fromMe: "Centros de Acopio Venezuela",
        };
        if (plantillaEnvio.mediaUrl) body.mediaUrl = plantillaEnvio.mediaUrl;

        const response = await fetch(`${WHAIBOT_BASE}/api/send-message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-key": config.apiKey,
            "x-client-botid": config.botId,
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        res.push({ numero, ok: data.success === true, msg: data.message || "" });
      } catch (e) {
        res.push({ numero, ok: false, msg: "Error de red" });
      }
      setResultados([...res]);
    }
    setEnviando(false);
  }

  // ── Guards ──
  if (authCargando) return <Spinner />;

  if (!usuario)
    return (
      <div className="px-4 pt-10">
        <EmptyState
          icon={<ShieldCheck className="size-8" />}
          titulo="Acceso de administrador"
          detalle="Inicia sesión para acceder al panel de WhaiBot."
          accion={<Button onClick={iniciarSesion}><LogIn className="size-4" /> Iniciar sesión</Button>}
        />
      </div>
    );

  if (!usuario.esAdmin)
    return (
      <div className="px-4 pt-10">
        <EmptyState icon={<ShieldCheck className="size-8" />} titulo="Sin permisos" detalle="Esta cuenta no es administradora." />
      </div>
    );

  // ── Vista de envío masivo ──
  if (plantillaEnvio) {
    const enviados = resultados.filter((r) => r.ok).length;
    const fallidos = resultados.filter((r) => !r.ok).length;
    const pendientes = seleccionados.size - resultados.length;

    return (
      <div className="px-4 pb-10 pt-4">
        <button
          onClick={() => setPlantillaEnvio(null)}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>

        <SectionHeader
          titulo={`Enviar: ${plantillaEnvio.nombre}`}
          descripcion="Selecciona los números a los que quieres enviar este mensaje."
          icon={<Send className="size-5" />}
          color="var(--accent)"
        />

        {/* Preview del mensaje */}
        <Card className="mt-4 p-4 border-l-4 border-l-primary bg-surface-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Vista previa del mensaje</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{plantillaEnvio.mensaje}</p>
          {plantillaEnvio.mediaUrl && (
            <p className="text-xs text-primary mt-2 truncate">🖼 {plantillaEnvio.mediaUrl}</p>
          )}
        </Card>

        {/* Resultados */}
        {resultados.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-success">{enviados}</p>
              <p className="text-xs text-muted">Enviados</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-danger">{fallidos}</p>
              <p className="text-xs text-muted">Fallidos</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-muted">{pendientes}</p>
              <p className="text-xs text-muted">Pendientes</p>
            </Card>
          </div>
        )}

        {/* Controles */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            <span className="font-bold text-foreground">{seleccionados.size}</span> de {numeros.length} seleccionados
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                seleccionados.size === numeros.length
                  ? setSeleccionados(new Set())
                  : setSeleccionados(new Set(numeros.map((n) => n.numero)))
              }
            >
              {seleccionados.size === numeros.length ? "Deseleccionar todos" : "Seleccionar todos"}
            </Button>
            <Button
              size="sm"
              onClick={enviarMensajes}
              disabled={seleccionados.size === 0 || enviando}
              cargando={enviando}
            >
              <Send className="size-3.5" /> Enviar ahora
            </Button>
          </div>
        </div>

        {/* Lista de números */}
        <ul className="mt-3 space-y-2">
          {numeros.map((n) => {
            const resultado = resultados.find((r) => r.numero === n.numero);
            const seleccionado = seleccionados.has(n.numero);
            return (
              <li key={n.numero}>
                <label
                  className={cx(
                    "flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition-all",
                    seleccionado ? "border-primary bg-primary/5" : "border-border bg-surface",
                    resultado && "pointer-events-none opacity-80",
                  )}
                >
                  <div
                    className={cx(
                      "size-5 rounded-full border-2 flex items-center justify-content-center shrink-0 transition-all",
                      seleccionado ? "border-primary bg-primary" : "border-border",
                    )}
                  >
                    {seleccionado && <Check className="size-3 text-on-primary m-auto" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={seleccionado}
                    onChange={() => toggleNumero(n.numero)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{n.numero}</p>
                    <p className="text-xs text-muted truncate">{n.centro}</p>
                  </div>
                  {resultado && (
                    resultado.ok
                      ? <CheckCircle2 className="size-4 text-success shrink-0" />
                      : <span title={resultado.msg} className="shrink-0"><AlertCircle className="size-4 text-danger" /></span>
                  )}
                  {!resultado && enviando && seleccionado && (
                    <Loader2 className="size-4 animate-spin text-muted shrink-0" />
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        {numeros.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon={<Building2 className="size-8" />}
              titulo="Sin centros aprobados"
              detalle="Aprueba centros de acopio para que aparezcan sus números de contacto aquí."
            />
          </div>
        )}
      </div>
    );
  }

  // ── Vista principal ──
  return (
    <div className="px-4 pb-10 pt-4">
      <Link href="/admin" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver al admin
      </Link>

      <SectionHeader
        titulo="WhaiBot"
        descripcion="Configura el bot de WhatsApp y envía mensajes a los centros de acopio."
        icon={<MessageSquare className="size-5" />}
        color="#25D366"
      />

      {cargando ? (
        <Spinner />
      ) : (
        <div className="mt-6 space-y-8">

          {/* ── SECCIÓN 1: Credenciales ── */}
          <section>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
              <Key className="size-4" /> Credenciales del Bot
            </h2>
            <Card className="p-4 space-y-4">
              <Field label="Bot ID" hint="El identificador único de tu bot (x-client-botid)">
                <Input
                  value={botId}
                  onChange={(e) => setBotId(e.target.value)}
                  placeholder="bot_1776008571136"
                />
              </Field>
              <Field label="API Key (Client Key)" hint="La clave secreta del bot (x-client-key)">
                <div className="relative">
                  <Input
                    type={mostrarApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarApiKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {mostrarApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              {/* Estado del bot */}
              {estadoBot !== "idle" && (
                <div
                  className={cx(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
                    estadoBot === "checking" && "bg-surface-2 text-muted",
                    estadoBot === "ready" && "bg-success-soft text-success",
                    estadoBot === "error" && "bg-danger-soft text-danger",
                  )}
                >
                  {estadoBot === "checking" && <Loader2 className="size-4 animate-spin" />}
                  {estadoBot === "ready" && <Wifi className="size-4" />}
                  {estadoBot === "error" && <WifiOff className="size-4" />}
                  {estadoBot === "checking" && "Verificando conexión..."}
                  {estadoBot === "ready" && "Bot conectado y listo ✓"}
                  {estadoBot === "error" && "Bot no disponible — verifica las credenciales"}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={probarConexion}
                  disabled={!botId.trim() || !apiKey.trim() || estadoBot === "checking"}
                >
                  <Wifi className="size-3.5" /> Probar conexión
                </Button>
                <Button
                  onClick={guardarCredenciales}
                  cargando={guardandoCreds}
                  disabled={!botId.trim() || !apiKey.trim()}
                >
                  <Save className="size-3.5" /> Guardar
                </Button>
              </div>

              {config && (
                <p className="text-xs text-muted">
                  Última actualización: {new Date(config.updatedAt).toLocaleString("es-VE")}
                </p>
              )}
            </Card>
          </section>

          {/* ── SECCIÓN 2: Plantillas ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <MessageSquare className="size-4" /> Plantillas de Mensaje
              </h2>
              <Button size="sm" onClick={abrirNuevaPlantilla}>
                <Plus className="size-3.5" /> Nueva plantilla
              </Button>
            </div>

            {plantillas.length === 0 ? (
              <Card className="p-6">
                <EmptyState
                  icon={<MessageSquare className="size-7" />}
                  titulo="Sin plantillas"
                  detalle="Crea plantillas para enviar mensajes rápidos a los centros de acopio."
                  accion={
                    <Button size="sm" onClick={abrirNuevaPlantilla}>
                      <Plus className="size-3.5" /> Crear primera plantilla
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {plantillas.map((p) => (
                  <PlantillaCard
                    key={p.id}
                    p={p}
                    onEditar={() => abrirEditarPlantilla(p)}
                    onEliminar={() => borrarPlantilla(p.id)}
                    onEnviar={() => {
                      if (!config) {
                        alert("Primero guarda las credenciales de WhaiBot.");
                        return;
                      }
                      abrirEnvio(p);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── SECCIÓN 3: Info centros ── */}
          <section>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
              <Building2 className="size-4" /> Centros con número de contacto
            </h2>
            <Card className="p-4">
              {numeros.length === 0 ? (
                <p className="text-sm text-muted">No hay centros aprobados con número de contacto.</p>
              ) : (
                <>
                  <p className="text-sm text-muted mb-3">
                    <span className="font-bold text-foreground">{numeros.length}</span> números únicos de{" "}
                    <span className="font-bold text-foreground">{centros.filter((c) => c.estado === "aprobado").length}</span> centros aprobados
                  </p>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {numeros.slice(0, 20).map((n) => (
                      <li key={n.numero} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs">
                        <span className="font-mono font-medium text-foreground">{n.numero}</span>
                        <span className="text-muted truncate">{n.centro}</span>
                        <Link href={`/centro?id=${n.id}`} className="text-primary hover:underline shrink-0">
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </li>
                    ))}
                    {numeros.length > 20 && (
                      <li className="text-center text-xs text-muted py-1">+{numeros.length - 20} más...</li>
                    )}
                  </ul>
                </>
              )}
            </Card>
          </section>
        </div>
      )}

      {/* ── MODAL: Nueva / editar plantilla ── */}
      {modalPlantilla && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md rounded-3xl bg-surface clay p-6 my-8">
            <button
              onClick={() => setModalPlantilla(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 bg-surface-2 hover:bg-surface-3 transition-colors text-muted"
            >
              <X className="size-5" />
            </button>
            <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              {editandoPlantilla ? "Editar plantilla" : "Nueva plantilla"}
            </h3>

            <div className="space-y-4">
              <Field label="Nombre de la plantilla" required>
                <Input
                  value={pNombre}
                  onChange={(e) => setPNombre(e.target.value)}
                  placeholder="Ej: Alerta de suministros urgentes"
                />
              </Field>

              <Field
                label="Mensaje"
                required
                hint="Puedes usar {nombre} para personalizar con el nombre del centro."
              >
                <Textarea
                  value={pMensaje}
                  onChange={(e) => setPMensaje(e.target.value)}
                  placeholder="Hola, les comunicamos que el centro {nombre} necesita apoyo urgente..."
                  rows={5}
                />
              </Field>

              <Field
                label="Imagen adjunta (opcional)"
                hint="Sube una imagen desde tu dispositivo o pega una URL pública."
              >
                <div className="space-y-2">
                  {/* Preview si hay imagen */}
                  {pMediaUrl && (
                    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface-2" style={{ maxHeight: 140 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pMediaUrl} alt="Preview" className="w-full object-cover" style={{ maxHeight: 140 }} />
                      <button
                        type="button"
                        onClick={() => setPMediaUrl("")}
                        className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Botón de carga local */}
                  <label
                    className={cx(
                      "flex items-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-3 cursor-pointer text-sm text-muted transition-colors hover:border-primary hover:text-primary",
                      pSubiendoImg && "pointer-events-none opacity-60",
                    )}
                  >
                    {pSubiendoImg ? (
                      <><Loader2 className="size-4 animate-spin" /> Subiendo imagen...</>
                    ) : (
                      <><ImagePlus className="size-4" /> Subir imagen desde mi dispositivo</>
                    )}
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onImagenLocal(e.target.files?.[0] ?? null)}
                    />
                  </label>

                  {/* O URL manual */}
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted">o pega una URL</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <Input
                    value={pMediaUrl}
                    onChange={(e) => setPMediaUrl(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>
              </Field>

              {/* Preview */}
              {pMensaje && (
                <div className="rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#128C7E] mb-1">Vista previa WhatsApp</p>
                  <div className="rounded-xl bg-white dark:bg-surface-2 p-3 shadow-sm max-w-[260px]">
                    <p className="text-xs text-foreground whitespace-pre-wrap">{pMensaje}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="secondary" full onClick={() => setModalPlantilla(false)}>
                Cancelar
              </Button>
              <Button full onClick={guardarPlantillaModal} cargando={guardandoP} disabled={!pNombre.trim() || !pMensaje.trim()}>
                <Save className="size-4" /> Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
