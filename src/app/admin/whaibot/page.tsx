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
  Mail,
  History,
  Lock,
  Search,
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
  registrarEnvioWhaibot,
  listarEnviosWhaibot,
  listarCampaniasEmail,
  crearCampaniaEmail,
  actualizarCampaniaEmail,
  eliminarCampaniaEmail,
  registrarEnvioEmail,
  listarEnviosEmail,
  listarUsuarios,
} from "@/lib/db";
import { fileADataUrl } from "@/lib/img";
import { useAuth } from "@/lib/auth";
import type {
  WhaibotConfig,
  WhaibotPlantilla,
  Centro,
  WhaibotEnvio,
  EmailCampania,
  EmailEnvioLog,
  Usuario,
} from "@/lib/types";
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

function normalizarNumero(tel: string): string {
  let n = tel.replace(/[^\d]/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0") && n.length >= 10) n = "58" + n.slice(1);
  if (
    n.length === 10 &&
    n.startsWith("4") &&
    /^4(1[2-9]|2[4-6]|1[4-6])/.test(n)
  ) {
    n = "58" + n;
  }
  return n;
}

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
// Subcomponentes
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

function CampaniaCard({
  c,
  onEditar,
  onEliminar,
  onEnviar,
}: {
  c: EmailCampania;
  onEditar: () => void;
  onEliminar: () => void;
  onEnviar: () => void;
}) {
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-sm text-foreground truncate">{c.nombre}</p>
          <p className="text-xs text-foreground font-semibold mt-0.5 truncate">Asunto: {c.asunto}</p>
          <p className="text-xs text-muted mt-0.5 line-clamp-2">{c.cuerpo.replace(/<[^>]*>/g, '')}</p>
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
        <Mail className="size-3.5" /> Enviar campaña
      </Button>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────

export default function WhaibotPage() {
  const { usuario, cargando: authCargando, iniciarSesion } = useAuth();
  const [tab, setTab] = useState<"whatsapp" | "email" | "historial">("whatsapp");

  // Credenciales
  const [config, setConfig] = useState<WhaibotConfig | null>(null);
  const [botId, setBotId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [mostrarApiKey, setMostrarApiKey] = useState(false);
  const [guardandoCreds, setGuardandoCreds] = useState(false);
  const [estadoBot, setEstadoBot] = useState<"idle" | "checking" | "ready" | "error">("idle");

  // Datos globales
  const [plantillas, setPlantillas] = useState<WhaibotPlantilla[]>([]);
  const [campanias, setCampanias] = useState<EmailCampania[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [numeros, setNumeros] = useState<{ numero: string; centro: string; id: string }[]>([]);

  // Historiales
  const [historialWhaibot, setHistorialWhaibot] = useState<WhaibotEnvio[]>([]);
  const [historialEmail, setHistorialEmail] = useState<EmailEnvioLog[]>([]);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");

  const [cargando, setCargando] = useState(true);

  // Modales
  const [modalPlantilla, setModalPlantilla] = useState(false);
  const [editandoPlantilla, setEditandoPlantilla] = useState<WhaibotPlantilla | null>(null);
  const [pNombre, setPNombre] = useState("");
  const [pMensaje, setPMensaje] = useState("");
  const [pMediaUrl, setPMediaUrl] = useState("");
  const [pSubiendoImg, setPSubiendoImg] = useState(false);
  const [guardandoP, setGuardandoP] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const [modalCampania, setModalCampania] = useState(false);
  const [editandoCampania, setEditandoCampania] = useState<EmailCampania | null>(null);
  const [cNombre, setCNombre] = useState("");
  const [cAsunto, setCAsunto] = useState("");
  const [cCuerpo, setCCuerpo] = useState("");
  const [guardandoC, setGuardandoC] = useState(false);

  // Envío masivo WhatsApp
  const [plantillaEnvio, setPlantillaEnvio] = useState<WhaibotPlantilla | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [resultados, setResultados] = useState<{ numero: string; ok: boolean; msg: string }[]>([]);
  const [numerosYaEnviados, setNumerosYaEnviados] = useState<Set<string>>(new Set());

  // Envío masivo Email
  const [campaniaEnvio, setCampaniaEnvio] = useState<EmailCampania | null>(null);
  const [seleccionadosEmail, setSeleccionadosEmail] = useState<Set<string>>(new Set());
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [resultadosEmail, setResultadosEmail] = useState<{ email: string; ok: boolean; msg: string }[]>([]);
  const [emailsYaEnviados, setEmailsYaEnviados] = useState<Set<string>>(new Set());

  const recargar = useCallback(async () => {
    const [cfg, ps, cs, camp, usr, hWh, hEm] = await Promise.all([
      obtenerWhaibotConfig(),
      listarPlantillas(),
      listarCentros(),
      listarCampaniasEmail(),
      listarUsuarios(),
      listarEnviosWhaibot(),
      listarEnviosEmail(),
    ]);
    setConfig(cfg);
    if (cfg) {
      setBotId(cfg.botId);
      setApiKey(cfg.apiKey);
    }
    setPlantillas(ps.sort((a, b) => b.creadoEn - a.creadoEn));
    setCentros(cs);
    setNumeros(extraerNumeros(cs));
    setCampanias(camp.sort((a, b) => b.creadoEn - a.creadoEn));
    setUsuarios(usr);
    setHistorialWhaibot(hWh);
    setHistorialEmail(hEm);
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

  // ── Modal plantilla WhatsApp ──
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

  // ── Modal campaña Email ──
  function abrirNuevaCampania() {
    setEditandoCampania(null);
    setCNombre(""); setCAsunto(""); setCCuerpo("");
    setModalCampania(true);
  }
  function abrirEditarCampania(c: EmailCampania) {
    setEditandoCampania(c);
    setCNombre(c.nombre); setCAsunto(c.asunto); setCCuerpo(c.cuerpo);
    setModalCampania(true);
  }

  async function guardarCampaniaModal() {
    if (!cNombre.trim() || !cAsunto.trim() || !cCuerpo.trim()) return;
    setGuardandoC(true);
    try {
      if (editandoCampania) {
        await actualizarCampaniaEmail({ ...editandoCampania, nombre: cNombre.trim(), asunto: cAsunto.trim(), cuerpo: cCuerpo.trim() });
      } else {
        await crearCampaniaEmail({ id: nuevoId(), nombre: cNombre.trim(), asunto: cAsunto.trim(), cuerpo: cCuerpo.trim(), creadoEn: Date.now() });
      }
      setModalCampania(false);
      await recargar();
    } finally {
      setGuardandoC(false);
    }
  }

  async function borrarCampania(id: string) {
    if (!confirm("¿Eliminar esta campaña de correo electrónico?")) return;
    await eliminarCampaniaEmail(id);
    await recargar();
  }

  // ── Envío masivo WhatsApp ──
  function abrirEnvio(p: WhaibotPlantilla) {
    setPlantillaEnvio(p);
    setResultados([]);

    // Obtener los números que ya recibieron exitosamente esta plantilla
    const yaEnviados = new Set(
      historialWhaibot
        .filter((h) => h.plantillaId === p.id && h.ok)
        .map((h) => h.numero)
    );
    setNumerosYaEnviados(yaEnviados);

    // Seleccionar por defecto solo los números a los que no se les ha enviado
    const defaultSeleccionados = new Set(
      numeros.map((n) => n.numero).filter((num) => !yaEnviados.has(num))
    );
    setSeleccionados(defaultSeleccionados);
  }

  function toggleNumero(num: string) {
    if (numerosYaEnviados.has(num)) return; // Evitar seleccionar si ya fue enviado
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
      if (res.length > 0) await new Promise((r) => setTimeout(r, 1500));
      const infoCentro = numeros.find((n) => n.numero === numero);
      const centroNombre = infoCentro?.centro ?? "Centro";

      try {
        const body: Record<string, string> = {
          to: numero,
          message: plantillaEnvio.mensaje.replace(/{nombre}/g, centroNombre),
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
        const ok = data.success === true;
        const msg = data.message || (ok ? "Enviado con éxito" : "Error en API");

        res.push({ numero, ok, msg });

        // Registrar en el historial de DB
        const log: WhaibotEnvio = {
          id: nuevoId(),
          plantillaId: plantillaEnvio.id,
          plantillaNombre: plantillaEnvio.nombre,
          numero,
          centroNombre,
          ok,
          error: ok ? undefined : msg,
          enviadoEn: Date.now(),
        };
        await registrarEnvioWhaibot(log);

      } catch (e) {
        const errMsg = "Error de red o conexión";
        res.push({ numero, ok: false, msg: errMsg });

        await registrarEnvioWhaibot({
          id: nuevoId(),
          plantillaId: plantillaEnvio.id,
          plantillaNombre: plantillaEnvio.nombre,
          numero,
          centroNombre,
          ok: false,
          error: errMsg,
          enviadoEn: Date.now(),
        });
      }
      setResultados([...res]);
    }
    setEnviando(false);
    await recargar();
  }

  // ── Envío masivo Email ──
  function abrirEnvioEmail(c: EmailCampania) {
    setCampaniaEnvio(c);
    setResultadosEmail([]);

    const yaEnviados = new Set(
      historialEmail
        .filter((h) => h.campaniaId === c.id && h.ok)
        .map((h) => h.email)
    );
    setEmailsYaEnviados(yaEnviados);

    const defaultSeleccionados = new Set(
      usuarios.map((u) => u.email).filter((email) => email && !yaEnviados.has(email))
    );
    setSeleccionadosEmail(defaultSeleccionados);
  }

  function toggleEmail(email: string) {
    if (emailsYaEnviados.has(email)) return;
    setSeleccionadosEmail((prev) => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  }

  async function enviarCampaniaEmails() {
    if (!campaniaEnvio || seleccionadosEmail.size === 0) return;
    setEnviandoEmail(true);
    setResultadosEmail([]);
    const lista = [...seleccionadosEmail];
    const res: { email: string; ok: boolean; msg: string }[] = [];

    for (const email of lista) {
      const usr = usuarios.find((u) => u.email === email);
      const nombre = usr?.nombre ?? "Voluntario/a";

      try {
        const response = await fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plantilla: "campania_email",
            datos: {
              to: email,
              campaniaAsunto: campaniaEnvio.asunto,
              campaniaCuerpo: campaniaEnvio.cuerpo.replace(/{nombre}/g, nombre),
            },
          }),
        });
        const data = await response.json();
        const ok = data.ok === true;
        const msg = ok ? "Correo enviado con éxito" : (data.error || "Error al enviar");

        res.push({ email, ok, msg });

        const log: EmailEnvioLog = {
          id: nuevoId(),
          campaniaId: campaniaEnvio.id,
          campaniaNombre: campaniaEnvio.nombre,
          email,
          usuarioNombre: nombre,
          ok,
          error: ok ? undefined : msg,
          enviadoEn: Date.now(),
        };
        await registrarEnvioEmail(log);

      } catch (e) {
        const errMsg = "Error de conexión con la API de email";
        res.push({ email, ok: false, msg: errMsg });

        await registrarEnvioEmail({
          id: nuevoId(),
          campaniaId: campaniaEnvio.id,
          campaniaNombre: campaniaEnvio.nombre,
          email,
          usuarioNombre: nombre,
          ok: false,
          error: errMsg,
          enviadoEn: Date.now(),
        });
      }
      setResultadosEmail([...res]);
    }
    setEnviandoEmail(false);
    await recargar();
  }

  // ── Filtros del Historial ──
  const enviosFiltradosWhaibot = historialWhaibot.filter((h) => {
    if (!busquedaHistorial) return true;
    const term = busquedaHistorial.toLowerCase();
    return (
      h.plantillaNombre.toLowerCase().includes(term) ||
      h.numero.toLowerCase().includes(term) ||
      h.centroNombre.toLowerCase().includes(term) ||
      (h.error && h.error.toLowerCase().includes(term))
    );
  });

  const enviosFiltradosEmail = historialEmail.filter((e) => {
    if (!busquedaHistorial) return true;
    const term = busquedaHistorial.toLowerCase();
    return (
      e.campaniaNombre.toLowerCase().includes(term) ||
      e.email.toLowerCase().includes(term) ||
      (e.usuarioNombre && e.usuarioNombre.toLowerCase().includes(term)) ||
      (e.error && e.error.toLowerCase().includes(term))
    );
  });

  // ── Guards ──
  if (authCargando) return <Spinner />;

  if (!usuario)
    return (
      <div className="px-4 pt-10">
        <EmptyState
          icon={<ShieldCheck className="size-8" />}
          titulo="Acceso de administrador"
          detalle="Inicia sesión para acceder al panel de WhaiBot y Correo Transaccional."
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

  // ── Vista de envío masivo WhatsApp ──
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
          titulo={`Enviar WhatsApp: ${plantillaEnvio.nombre}`}
          descripcion="Selecciona los números. Los números que ya recibieron este mensaje están bloqueados (deduplicación)."
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
            {numerosYaEnviados.size > 0 && (
              <span className="text-xs text-success ml-2">({numerosYaEnviados.size} ya enviados excluidos)</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const filt = numeros.map((n) => n.numero).filter((num) => !numerosYaEnviados.has(num));
                seleccionados.size === filt.length
                  ? setSeleccionados(new Set())
                  : setSeleccionados(new Set(filt));
              }}
            >
              {seleccionados.size === numeros.map((n) => n.numero).filter((num) => !numerosYaEnviados.has(num)).length ? "Deseleccionar todos" : "Seleccionar no enviados"}
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
            const yaEnviado = numerosYaEnviados.has(n.numero);
            const seleccionado = seleccionados.has(n.numero);

            return (
              <li key={n.numero}>
                <label
                  onClick={() => !yaEnviado && toggleNumero(n.numero)}
                  className={cx(
                    "flex items-center gap-3 rounded-2xl border p-3 transition-all",
                    yaEnviado ? "border-border bg-surface-2 opacity-50 cursor-not-allowed" : "cursor-pointer",
                    seleccionado && !yaEnviado ? "border-primary bg-primary/5" : "border-border bg-surface",
                    resultado && "pointer-events-none opacity-80",
                  )}
                >
                  <div
                    className={cx(
                      "size-5 rounded-full border-2 flex items-center justify-content-center shrink-0 transition-all",
                      seleccionado && !yaEnviado ? "border-primary bg-primary" : "border-border",
                      yaEnviado && "border-success bg-success-soft"
                    )}
                  >
                    {seleccionado && !yaEnviado && <Check className="size-3 text-on-primary m-auto" />}
                    {yaEnviado && <Lock className="size-2.5 text-success m-auto" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      {n.numero}
                      {yaEnviado && <Badge tono="success" className="text-[9px] py-0 px-1.5 font-bold">YA ENVIADO</Badge>}
                    </p>
                    <p className="text-xs text-muted truncate">{n.centro}</p>
                  </div>
                  {resultado && (
                    resultado.ok
                      ? <CheckCircle2 className="size-4 text-success shrink-0" />
                      : <span title={resultado.msg} className="shrink-0 inline-flex"><AlertCircle className="size-4 text-danger" /></span>
                  )}
                  {!resultado && enviando && seleccionado && !yaEnviado && (
                    <Loader2 className="size-4 animate-spin text-muted shrink-0" />
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ── Vista de envío masivo Email ──
  if (campaniaEnvio) {
    const enviados = resultadosEmail.filter((r) => r.ok).length;
    const fallidos = resultadosEmail.filter((r) => !r.ok).length;
    const pendientes = seleccionadosEmail.size - resultadosEmail.length;

    return (
      <div className="px-4 pb-10 pt-4">
        <button
          onClick={() => setCampaniaEnvio(null)}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>

        <SectionHeader
          titulo={`Enviar Email: ${campaniaEnvio.nombre}`}
          descripcion="Selecciona los destinatarios. Los usuarios que ya recibieron este correo están excluidos (deduplicación)."
          icon={<Mail className="size-5" />}
          color="var(--primary)"
        />

        {/* Preview del correo */}
        <Card className="mt-4 p-4 border-l-4 border-l-primary bg-surface-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Vista previa del correo</p>
          <p className="text-sm font-bold text-foreground">Asunto: {campaniaEnvio.asunto}</p>
          <div className="text-sm text-foreground mt-2 bg-surface p-3 rounded-xl border border-border whitespace-pre-wrap">
            {campaniaEnvio.cuerpo}
          </div>
        </Card>

        {/* Resultados */}
        {resultadosEmail.length > 0 && (
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
            <span className="font-bold text-foreground">{seleccionadosEmail.size}</span> de {usuarios.length} seleccionados
            {emailsYaEnviados.size > 0 && (
              <span className="text-xs text-success ml-2">({emailsYaEnviados.size} ya enviados excluidos)</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const filt = usuarios.map((u) => u.email).filter((email) => email && !emailsYaEnviados.has(email));
                seleccionadosEmail.size === filt.length
                  ? setSeleccionadosEmail(new Set())
                  : setSeleccionadosEmail(new Set(filt));
              }}
            >
              {seleccionadosEmail.size === usuarios.map((u) => u.email).filter((email) => email && !emailsYaEnviados.has(email)).length ? "Deseleccionar todos" : "Seleccionar no enviados"}
            </Button>
            <Button
              size="sm"
              onClick={enviarCampaniaEmails}
              disabled={seleccionadosEmail.size === 0 || enviandoEmail}
              cargando={enviandoEmail}
            >
              <Mail className="size-3.5" /> Enviar ahora
            </Button>
          </div>
        </div>

        {/* Lista de emails */}
        <ul className="mt-3 space-y-2">
          {usuarios.map((u) => {
            if (!u.email) return null;
            const resultado = resultadosEmail.find((r) => r.email === u.email);
            const yaEnviado = emailsYaEnviados.has(u.email);
            const seleccionado = seleccionadosEmail.has(u.email);

            return (
              <li key={u.uid}>
                <label
                  onClick={() => !yaEnviado && toggleEmail(u.email)}
                  className={cx(
                    "flex items-center gap-3 rounded-2xl border p-3 transition-all",
                    yaEnviado ? "border-border bg-surface-2 opacity-50 cursor-not-allowed" : "cursor-pointer",
                    seleccionado && !yaEnviado ? "border-primary bg-primary/5" : "border-border bg-surface",
                    resultado && "pointer-events-none opacity-80",
                  )}
                >
                  <div
                    className={cx(
                      "size-5 rounded-full border-2 flex items-center justify-content-center shrink-0 transition-all",
                      seleccionado && !yaEnviado ? "border-primary bg-primary" : "border-border",
                      yaEnviado && "border-success bg-success-soft"
                    )}
                  >
                    {seleccionado && !yaEnviado && <Check className="size-3 text-on-primary m-auto" />}
                    {yaEnviado && <Lock className="size-2.5 text-success m-auto" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      {u.nombre}
                      {yaEnviado && <Badge tono="success" className="text-[9px] py-0 px-1.5 font-bold">YA ENVIADO</Badge>}
                    </p>
                    <p className="text-xs text-muted truncate">{u.email}</p>
                  </div>
                  {resultado && (
                    resultado.ok
                      ? <CheckCircle2 className="size-4 text-success shrink-0" />
                      : <span title={resultado.msg} className="shrink-0 inline-flex"><AlertCircle className="size-4 text-danger" /></span>
                  )}
                  {!resultado && enviandoEmail && seleccionado && !yaEnviado && (
                    <Loader2 className="size-4 animate-spin text-muted shrink-0" />
                  )}
                </label>
              </li>
            );
          })}
        </ul>
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
        titulo="WhaiBot & Campañas"
        descripcion="Administra y envía comunicaciones masivas a los centros vía WhatsApp o Email."
        icon={<MessageSquare className="size-5" />}
        color="#25D366"
      />

      {/* Tabs */}
      <div className="mt-6 flex border-b border-border gap-2">
        <button
          onClick={() => setTab("whatsapp")}
          className={cx(
            "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
            tab === "whatsapp" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <MessageSquare className="size-4" /> WhatsApp
        </button>
        <button
          onClick={() => setTab("email")}
          className={cx(
            "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
            tab === "email" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <Mail className="size-4" /> Correo Electrónico
        </button>
        <button
          onClick={() => setTab("historial")}
          className={cx(
            "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
            tab === "historial" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <History className="size-4" /> Historial de Envíos
        </button>
      </div>

      {cargando ? (
        <Spinner />
      ) : (
        <div className="mt-6 space-y-8">

          {/* TAB: WHATSAPP */}
          {tab === "whatsapp" && (
            <>
              {/* Credenciales */}
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
                </Card>
              </section>

              {/* Plantillas WhatsApp */}
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
                      titulo="Sin plantillas de WhatsApp"
                      detalle="Crea plantillas para enviar mensajes rápidos a los centros de acopio."
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
            </>
          )}

          {/* TAB: CORREO ELECTRÓNICO */}
          {tab === "email" && (
            <>
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                    <Mail className="size-4" /> Campañas de Correo
                  </h2>
                  <Button size="sm" onClick={abrirNuevaCampania}>
                    <Plus className="size-3.5" /> Nueva campaña
                  </Button>
                </div>

                {campanias.length === 0 ? (
                  <Card className="p-6">
                    <EmptyState
                      icon={<Mail className="size-7" />}
                      titulo="Sin campañas de email"
                      detalle="Crea una campaña para enviar correos masivos a todos los voluntarios registrados."
                    />
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {campanias.map((c) => (
                      <CampaniaCard
                        key={c.id}
                        c={c}
                        onEditar={() => abrirEditarCampania(c)}
                        onEliminar={() => borrarCampania(c.id)}
                        onEnviar={() => abrirEnvioEmail(c)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* TAB: HISTORIAL */}
          {tab === "historial" && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                  <History className="size-4" /> Registro General de Envíos
                </h2>

                <div className="relative max-w-xs w-full">
                  <Input
                    value={busquedaHistorial}
                    onChange={(e) => setBusquedaHistorial(e.target.value)}
                    placeholder="Buscar por plantilla, destinatario, centro..."
                    className="pl-10 h-10 text-xs"
                  />
                  <Search className="size-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Historial WhatsApp */}
              <div>
                <h3 className="text-xs font-bold uppercase text-muted mb-2">Envíos de WhatsApp ({enviosFiltradosWhaibot.length})</h3>
                <Card className="overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    {enviosFiltradosWhaibot.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted">No hay registros de envío.</div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-surface-2 border-b border-border">
                            <th className="p-3 font-semibold text-muted">Plantilla</th>
                            <th className="p-3 font-semibold text-muted">Centro / Número</th>
                            <th className="p-3 font-semibold text-muted">Fecha</th>
                            <th className="p-3 font-semibold text-muted">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enviosFiltradosWhaibot.map((h) => (
                            <tr key={h.id} className="border-b border-border last:border-0 hover:bg-surface-2/40">
                              <td className="p-3 font-medium text-foreground">{h.plantillaNombre}</td>
                              <td className="p-3">
                                <p className="font-bold text-foreground">{h.centroNombre}</p>
                                <p className="text-[10px] text-muted">{h.numero}</p>
                              </td>
                              <td className="p-3 text-muted">{new Date(h.enviadoEn).toLocaleString("es-VE")}</td>
                              <td className="p-3">
                                {h.ok ? (
                                  <Badge tono="success" className="text-[10px] py-0 px-2">EXITOSO</Badge>
                                ) : (
                                  <span className="flex items-center gap-1 text-danger font-semibold">
                                    <AlertCircle className="size-3.5" />
                                    {h.error || "Fallido"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>
              </div>

              {/* Historial Email */}
              <div>
                <h3 className="text-xs font-bold uppercase text-muted mb-2">Envíos de Correo ({enviosFiltradosEmail.length})</h3>
                <Card className="overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto">
                    {enviosFiltradosEmail.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted">No hay registros de envío.</div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-surface-2 border-b border-border">
                            <th className="p-3 font-semibold text-muted">Campaña</th>
                            <th className="p-3 font-semibold text-muted">Destinatario</th>
                            <th className="p-3 font-semibold text-muted">Fecha</th>
                            <th className="p-3 font-semibold text-muted">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enviosFiltradosEmail.map((e) => (
                            <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-2/40">
                              <td className="p-3 font-medium text-foreground">{e.campaniaNombre}</td>
                              <td className="p-3">
                                <p className="font-bold text-foreground">{e.usuarioNombre || "Usuario"}</p>
                                <p className="text-[10px] text-muted">{e.email}</p>
                              </td>
                              <td className="p-3 text-muted">{new Date(e.enviadoEn).toLocaleString("es-VE")}</td>
                              <td className="p-3">
                                {e.ok ? (
                                  <Badge tono="success" className="text-[10px] py-0 px-2">ENVIADO</Badge>
                                ) : (
                                  <span className="flex items-center gap-1 text-danger font-semibold">
                                    <AlertCircle className="size-3.5" />
                                    {e.error || "Fallido"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>
              </div>
            </section>
          )}

        </div>
      )}

      {/* ── MODAL: Nueva / editar plantilla WhatsApp ── */}
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
              {editandoPlantilla ? "Editar plantilla WhatsApp" : "Nueva plantilla WhatsApp"}
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

      {/* ── MODAL: Nueva / editar campaña Email ── */}
      {modalCampania && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md rounded-3xl bg-surface clay p-6 my-8">
            <button
              onClick={() => setModalCampania(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 bg-surface-2 hover:bg-surface-3 transition-colors text-muted"
            >
              <X className="size-5" />
            </button>
            <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              <Mail className="size-5 text-primary" />
              {editandoCampania ? "Editar Campaña Email" : "Nueva Campaña Email"}
            </h3>

            <div className="space-y-4">
              <Field label="Nombre interno de la campaña" required hint="Solo para control tuyo en este panel.">
                <Input
                  value={cNombre}
                  onChange={(e) => setCNombre(e.target.value)}
                  placeholder="Ej: Boletín de Junio 2026"
                />
              </Field>

              <Field label="Asunto del correo" required>
                <Input
                  value={cAsunto}
                  onChange={(e) => setCAsunto(e.target.value)}
                  placeholder="Ej: 🚨 Nuevas guías de distribución de alimentos"
                />
              </Field>

              <Field
                label="Cuerpo del correo (Contenido)"
                required
                hint="Puedes usar {nombre} para personalizar el saludo."
              >
                <Textarea
                  value={cCuerpo}
                  onChange={(e) => setCCuerpo(e.target.value)}
                  placeholder="Escribe el cuerpo del correo en texto plano o HTML..."
                  rows={8}
                />
              </Field>
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="secondary" full onClick={() => setModalCampania(false)}>
                Cancelar
              </Button>
              <Button full onClick={guardarCampaniaModal} cargando={guardandoC} disabled={!cNombre.trim() || !cAsunto.trim() || !cCuerpo.trim()}>
                <Save className="size-4" /> Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
