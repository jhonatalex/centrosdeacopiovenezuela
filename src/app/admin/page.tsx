"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Check,
  X,
  Phone,
  User,
  MapPin,
  Building2,
  Clock,
  LogIn,
  Edit,
  Save,
  UserCheck,
  Camera,
  Loader2,
  MessageSquare,
} from "lucide-react";
import {
  listarCentros,
  moderarCentro,
  actualizarCentro,
  listarUsuarios, subirFoto,
  listarSolicitudesResponsabilidad,
  responderSolicitudResponsabilidad,
} from "@/lib/db";
import { fileADataUrl } from "@/lib/img";
import { useAuth } from "@/lib/auth";
import type { Centro, EstadoModeracion, Usuario, SolicitudResponsabilidad } from "@/lib/types";
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
  ChipInput,
  cx,
} from "@/components/ui";

const filtros: { key: EstadoModeracion; label: string }[] = [
  { key: "pendiente", label: "Pendientes" },
  { key: "aprobado", label: "Aprobados" },
  { key: "rechazado", label: "Rechazados" },
];

export default function AdminPage() {
  const { usuario, cargando: authCargando, iniciarSesion } = useAuth();
  const [centros, setCentros] = useState<Centro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudResponsabilidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<EstadoModeracion | "usuarios" | "solicitudes">("pendiente");
  const [procesando, setProcesando] = useState<string | null>(null);

  // Estados para el editor
  const [editando, setEditando] = useState<Centro | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDireccion, setEditDireccion] = useState("");
  const [editCiudad, setEditCiudad] = useState("");
  const [editZona, setEditZona] = useState("");
  const [editContacto, setEditContacto] = useState<string[]>([]);
  const [editNecesita, setEditNecesita] = useState<string[]>([]);
  const [editSobra, setEditSobra] = useState<string[]>([]);
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editInstitucion, setEditInstitucion] = useState("");
  const [editRegNombre, setEditRegNombre] = useState("");
  const [editRegContacto, setEditRegContacto] = useState("");
  // Fotos del editor: mezcla de URLs existentes + nuevos dataURLs
  const [editFotos, setEditFotos] = useState<string[]>([]);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  async function recargar() {
    setCentros(await listarCentros());
    setUsuarios(await listarUsuarios());
    setSolicitudes(await listarSolicitudesResponsabilidad());
    setCargando(false);
  }
  useEffect(() => {
    if (usuario?.esAdmin) recargar();
  }, [usuario]);

  async function moderar(id: string, estado: "aprobado" | "rechazado") {
    let motivo: string | undefined;
    if (estado === "rechazado") {
      motivo = window.prompt("Motivo del rechazo (opcional):") ?? "";
    }
    setProcesando(id);
    try {
      await moderarCentro(id, estado, motivo);

      // Enviar notificación por email al registrador del centro
      const centro = centros.find((c) => c.id === id);
      const emailDest = centro?.registradorEmail;
      if (emailDest && centro) {
        fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plantilla: estado === "aprobado" ? "centro_aprobado" : "centro_rechazado",
            datos: {
              to: emailDest,
              centroNombre: centro.nombre,
              centroId: centro.id,
              centroDireccion: centro.direccion,
              centroCiudad: centro.ciudad,
              registradorNombre: centro.registradorNombre,
              motivoRechazo: motivo || undefined,
            },
          }),
        }).catch((err) => console.warn("[email] No se pudo enviar notificación:", err));
      }

      await recargar();
    } finally {
      setProcesando(null);
    }
  }


  async function responderSolicitud(id: string, estado: "aceptada" | "rechazada") {
    setProcesando(id);
    try {
      await responderSolicitudResponsabilidad(id, estado);
      await recargar();
    } finally {
      setProcesando(null);
    }
  }

  const iniciarEdicion = (c: Centro) => {
    setEditando(c);
    setEditNombre(c.nombre);
    setEditDireccion(c.direccion);
    setEditCiudad(c.ciudad);
    setEditZona(c.zona || "");
    setEditContacto(c.contactoCentro.split(",").map(x => x.trim()).filter(Boolean));
    setEditNecesita(c.necesita);
    setEditSobra(c.sobra);
    setEditDescripcion(c.descripcion || "");
    setEditInstitucion(c.institucion || "");
    setEditRegNombre(c.registradorNombre || "");
    setEditRegContacto(c.registradorContacto || "");
    setEditFotos(c.fotos || []);
  };

  async function onFotosEdicion(files: FileList | null) {
    if (!files) return;
    setProcesandoFoto(true);
    try {
      const restantes = 3 - editFotos.length;
      const nuevas: string[] = [];
      for (const f of Array.from(files).slice(0, restantes)) {
        nuevas.push(await fileADataUrl(f));
      }
      setEditFotos((p) => [...p, ...nuevas].slice(0, 3));
    } finally {
      setProcesandoFoto(false);
      // Reset input so the same file can be re-selected if needed
      if (fotoInputRef.current) fotoInputRef.current.value = "";
    }
  }

  const guardarCambios = async () => {
    if (!editando || !editNombre.trim() || !editDireccion.trim() || !editCiudad.trim() || editContacto.length === 0) return;
    setProcesando(editando.id);
    try {
      // Upload any new photos (dataURLs) to Storage; keep existing URLs as-is
      const urlsFinales: string[] = [];
      let newPhotoIndex = 0;
      for (const foto of editFotos) {
        if (foto.startsWith("data:")) {
          // New photo — upload to Storage
          const ruta = `centros/${editando.id}/edit_${Date.now()}_${newPhotoIndex}.jpg`;
          urlsFinales.push(await subirFoto(foto, ruta));
          newPhotoIndex++;
        } else {
          // Existing URL — keep as-is
          urlsFinales.push(foto);
        }
      }

      const centroActualizado: Centro = {
        ...editando,
        nombre: editNombre.trim(),
        direccion: editDireccion.trim(),
        ciudad: editCiudad.trim(),
        zona: editZona.trim() || undefined,
        contactoCentro: editContacto.join(", "),
        necesita: editNecesita,
        sobra: editSobra,
        descripcion: editDescripcion.trim() || undefined,
        institucion: editInstitucion.trim() || undefined,
        registradorNombre: editRegNombre.trim() || undefined,
        registradorContacto: editRegContacto.trim() || undefined,
        fotos: urlsFinales,
      };
      await actualizarCentro(centroActualizado);
      setEditando(null);
      await recargar();
    } finally {
      setProcesando(null);
    }
  };

  if (authCargando) return <Spinner />;

  if (!usuario)
    return (
      <div className="px-4 pt-10">
        <EmptyState
          icon={<ShieldCheck className="size-8" />}
          titulo="Acceso de administrador"
          detalle="Inicia sesión con una cuenta autorizada para moderar centros."
          accion={
            <Button onClick={iniciarSesion}>
              <LogIn className="size-4" /> Iniciar sesión
            </Button>
          }
        />
      </div>
    );

  if (!usuario.esAdmin)
    return (
      <div className="px-4 pt-10">
        <EmptyState
          icon={<ShieldCheck className="size-8" />}
          titulo="Sin permisos"
          detalle={`La cuenta ${usuario.email} no es administradora. Agrega el correo a NEXT_PUBLIC_ADMIN_EMAILS.`}
        />
      </div>
    );

  const lista = centros.filter((c) => c.estado === filtro);

  return (
    <div className="px-4 pb-10 pt-4">
      <SectionHeader
        titulo="Panel de administración"
        descripcion="Valida la información antes de publicar los centros."
        icon={<ShieldCheck className="size-5" />}
        color="var(--accent)"
      />

      {/* Acceso rápido a WhaiBot */}
      <Link
        href="/admin/whaibot"
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/5 px-4 py-3 hover:bg-[#25D366]/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-[#25D366] text-white">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">WhaiBot — Mensajería</p>
            <p className="text-xs text-muted">Configura el bot y envía mensajes a los centros</p>
          </div>
        </div>
        <svg className="size-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </Link>

      <div className="mt-4 flex flex-wrap gap-2">
        {filtros.map((f) => {
          const n = centros.filter((c) => c.estado === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={cx(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                filtro === f.key
                  ? "bg-foreground text-background"
                  : "bg-surface-2 text-muted hover:text-foreground",
              )}
            >
              {f.label} <span className="opacity-70">({n})</span>
            </button>
          );
        })}
        <button
          onClick={() => setFiltro("usuarios")}
          className={cx(
            "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
            filtro === "usuarios"
              ? "bg-foreground text-background"
              : "bg-surface-2 text-muted hover:text-foreground",
          )}
        >
          Usuarios <span className="opacity-70">({usuarios.length})</span>
        </button>
        <button
          onClick={() => setFiltro("solicitudes")}
          className={cx(
            "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
            filtro === "solicitudes"
              ? "bg-foreground text-background"
              : "bg-surface-2 text-muted hover:text-foreground",
          )}
        >
          Solicitudes <span className="opacity-70">({solicitudes.length})</span>
        </button>
      </div>

      {cargando ? (
        <Spinner />
      ) : filtro === "usuarios" ? (
        usuarios.length === 0 ? (
          <div className="mt-6">
            <EmptyState titulo="No hay usuarios" detalle="Aún no se han registrado usuarios en el sistema." />
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {usuarios.map((u) => {
              const creados = centros.filter(
                (c) => c.registradorUid === u.uid || c.registradorEmail === u.email
              );
              return (
                <Card key={u.uid} className="p-4">
                  <div className="flex items-center gap-3">
                    {u.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.foto} alt="" className="size-12 rounded-full border border-border shadow-sm" />
                    ) : (
                      <span className="grid size-12 place-items-center rounded-full bg-primary text-on-primary font-bold text-sm">
                        {u.nombre.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display font-bold text-foreground text-sm sm:text-base">{u.nombre}</p>
                        {u.esAdmin && (
                          <Badge tono="warning" className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted truncate">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge tono={creados.length > 0 ? "primary" : "neutral"} className="font-semibold text-xs">
                        {creados.length} {creados.length === 1 ? "centro" : "centros"}
                      </Badge>
                    </div>
                  </div>

                  {creados.length > 0 && (
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <p className="text-xs font-semibold text-muted mb-2">Centros registrados por este usuario:</p>
                      <ul className="space-y-2">
                        {creados.map((c) => (
                          <li
                            key={c.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground truncate">{c.nombre}</p>
                              <p className="text-[10px] text-muted truncate">
                                {c.direccion}, {c.ciudad}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                tono={
                                  c.estado === "aprobado"
                                    ? "success"
                                    : c.estado === "pendiente"
                                      ? "warning"
                                      : "danger"
                                }
                                className="text-[9px] font-bold px-2 py-0.5 capitalize"
                              >
                                {c.estado}
                              </Badge>
                              <button
                                onClick={() => setFiltro(c.estado)}
                                className="text-[10px] font-medium text-primary hover:underline"
                              >
                                Ver →
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              );
            })}
          </ul>
        )
      ) : filtro === "solicitudes" ? (
        solicitudes.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              titulo="No hay solicitudes"
              detalle="No se han registrado solicitudes de responsabilidad en el sistema."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {solicitudes.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-display font-bold text-foreground text-sm sm:text-base">
                        {s.solicitanteNombre}
                      </p>
                      <Badge
                        tono={
                          s.estado === "aceptada"
                            ? "success"
                            : s.estado === "pendiente"
                              ? "warning"
                              : "danger"
                        }
                        className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider"
                      >
                        {s.estado}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mb-2">{s.solicitanteEmail}</p>

                    <div className="space-y-1 text-xs">
                      <p className="flex items-center gap-1.5 text-muted">
                        <Phone className="size-3.5" />
                        <span className="font-semibold">Teléfono:</span> {s.solicitanteContacto}
                      </p>
                      <p className="flex items-center gap-1.5 text-muted">
                        <Building2 className="size-3.5" />
                        <span className="font-semibold">Centro solicitado:</span>{" "}
                        <Link href={`/centro/${s.centroId}`} className="text-primary hover:underline font-semibold">
                          {s.centroNombre}
                        </Link>
                      </p>
                      <p className="flex items-center gap-1.5 text-muted">
                        <Clock className="size-3.5" />
                        <span className="font-semibold">Fecha:</span>{" "}
                        {new Date(s.creadoEn).toLocaleString("es-VE")}
                      </p>
                    </div>
                  </div>

                  {s.estado === "pendiente" && (
                    <div className="flex sm:flex-col gap-2 shrink-0 justify-end sm:justify-start">
                      <Button
                        variant="outline"
                        size="sm"
                        cargando={procesando === s.id}
                        onClick={() => responderSolicitud(s.id, "rechazada")}
                      >
                        <X className="size-3.5 text-danger" /> Rechazar
                      </Button>
                      <Button
                        size="sm"
                        cargando={procesando === s.id}
                        onClick={() => responderSolicitud(s.id, "aceptada")}
                      >
                        <Check className="size-3.5" /> Aceptar y Asignar
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </ul>
        )
      ) : lista.length === 0 ? (
        <div className="mt-6">
          <EmptyState titulo="Nada por aquí" detalle="No hay centros en este estado." />
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {lista.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="flex gap-3 p-4">
                <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {c.fotos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.fotos[0]} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-2">
                      <Building2 className="size-7" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold">{c.nombre}</p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <MapPin className="size-3.5" /> {c.direccion}, {c.ciudad}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <Clock className="size-3.5" />
                    {new Date(c.creadoEn).toLocaleString("es-VE")}
                  </p>
                </div>
              </div>

              {c.fotos.length > 1 && (
                <div className="flex gap-2 px-4 pb-2">
                  {c.fotos.slice(1).map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={f} alt="" className="size-14 rounded-lg object-cover" />
                  ))}
                </div>
              )}

              <div className="space-y-2 px-4 pb-3 text-sm">
                {c.necesita.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-danger">Necesita:</span>
                    {c.necesita.map((n) => (
                      <Badge key={n} tono="danger">{n}</Badge>
                    ))}
                  </div>
                )}
                {c.sobra.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-success">Comparte:</span>
                    {c.sobra.map((s) => (
                      <Badge key={s} tono="success">{s}</Badge>
                    ))}
                  </div>
                )}
                {c.descripcion && <p className="text-muted">{c.descripcion}</p>}
                <p className="flex items-center gap-1 text-muted">
                  <Phone className="size-3.5" /> {c.contactoCentro}
                </p>
              </div>

              {/* Datos privados del registrador */}
              <div className="mx-4 mb-3 rounded-xl bg-surface-2 p-3 text-xs">
                <p className="mb-1 font-semibold uppercase tracking-wide text-muted-2">
                  Registrador (privado)
                </p>
                <p className="flex items-center gap-1 text-muted">
                  <User className="size-3.5" /> {c.registradorNombre || "—"}
                </p>
                <p className="flex items-center gap-1 text-muted">
                  <Phone className="size-3.5" /> {c.registradorContacto || "—"}
                </p>
              </div>

              {c.motivoRechazo && (
                <p className="mx-4 mb-3 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
                  Motivo de rechazo: {c.motivoRechazo}
                </p>
              )}

              <div className="flex flex-wrap gap-2 border-t border-border p-3 justify-end items-center">
                {c.estado === "aprobado" && (
                  <Link
                    href={`/centro/${c.id}`}
                    className="text-xs font-semibold text-primary mr-auto pl-2"
                  >
                    Ver en público →
                  </Link>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => iniciarEdicion(c)}
                  disabled={procesando !== null}
                >
                  <Edit className="size-3.5" /> Editar
                </Button>

                {c.estado === "pendiente" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      cargando={procesando === c.id}
                      onClick={() => moderar(c.id, "rechazado")}
                    >
                      <X className="size-3.5 text-danger" /> Rechazar
                    </Button>
                    <Button
                      size="sm"
                      cargando={procesando === c.id}
                      onClick={() => moderar(c.id, "aprobado")}
                    >
                      <Check className="size-3.5" /> Aprobar
                    </Button>
                  </>
                )}

                {c.estado === "aprobado" && (
                  <Button
                    variant="outline"
                    size="sm"
                    cargando={procesando === c.id}
                    onClick={() => moderar(c.id, "rechazado")}
                  >
                    <X className="size-3.5 text-danger" /> Quitar / Rechazar
                  </Button>
                )}

                {c.estado === "rechazado" && (
                  <Button
                    size="sm"
                    cargando={procesando === c.id}
                    onClick={() => moderar(c.id, "aprobado")}
                  >
                    <Check className="size-3.5" /> Aprobar / Activar
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </ul>
      )}
      {/* Modal de edición */}
      {editando && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface clay p-6 my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditando(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 bg-surface-2 hover:bg-surface-3 transition-colors text-muted"
            >
              <X className="size-5" />
            </button>
            <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              <Edit className="size-5 text-primary" /> Editar Centro de Acopio
            </h3>

            <div className="space-y-4 text-sm">

              {/* ── Fotos ── */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Fotos del centro <span className="font-normal normal-case">(máx. 3)</span></p>
                <div className="flex flex-wrap gap-2">
                  {editFotos.map((f, i) => (
                    <div key={i} className="relative size-24 overflow-hidden rounded-xl border border-border bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditFotos((p) => p.filter((_, j) => j !== i))}
                        aria-label="Quitar foto"
                        className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                      >
                        <X className="size-3.5" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide">Principal</span>
                      )}
                    </div>
                  ))}
                  {editFotos.length < 3 && (
                    <label
                      className={`grid size-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border text-muted transition-colors hover:border-primary hover:text-primary ${procesandoFoto ? "pointer-events-none opacity-60" : ""
                        }`}
                    >
                      {procesandoFoto ? (
                        <Loader2 className="size-6 animate-spin" />
                      ) : (
                        <span className="flex flex-col items-center gap-1 text-[11px]">
                          <Camera className="size-6" /> Añadir
                        </span>
                      )}
                      <input
                        ref={fotoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => onFotosEdicion(e.target.files)}
                      />
                    </label>
                  )}
                </div>
                {editFotos.length === 0 && (
                  <p className="mt-2 text-xs text-muted">Sin fotos. Añade al menos una imagen del centro.</p>
                )}
              </div>

              <Field label="Nombre del centro" required>
                <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
              </Field>
              <Field label="Dirección o referencia" required>
                <Input value={editDireccion} onChange={(e) => setEditDireccion(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ciudad" required>
                  <Input value={editCiudad} onChange={(e) => setEditCiudad(e.target.value)} />
                </Field>
                <Field label="Zona / Parroquia">
                  <Input value={editZona} onChange={(e) => setEditZona(e.target.value)} />
                </Field>
              </div>
              <Field label="Institución responsable">
                <Input value={editInstitucion} onChange={(e) => setEditInstitucion(e.target.value)} />
              </Field>
              <Field label="Teléfono(s) de contacto" required hint="Escribe cada número y presiona Enter.">
                <ChipInput valores={editContacto} onChange={setEditContacto} tono="primary" />
              </Field>
              <Field label="¿Qué necesita con urgencia?">
                <ChipInput valores={editNecesita} onChange={setEditNecesita} tono="danger" />
              </Field>
              <Field label="¿Qué puede compartir / donar?">
                <ChipInput valores={editSobra} onChange={setEditSobra} tono="success" />
              </Field>
              <Field label="Descripción / Horarios">
                <Textarea value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)} />
              </Field>
              <div className="border-t border-border pt-4 mt-2 space-y-3">
                <p className="font-bold text-xs uppercase tracking-wider text-muted">Datos privados del registrador</p>
                <Field label="Nombre del registrador">
                  <Input value={editRegNombre} onChange={(e) => setEditRegNombre(e.target.value)} />
                </Field>
                <Field label="Contacto del registrador">
                  <Input value={editRegContacto} onChange={(e) => setEditRegContacto(e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" full onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button full onClick={guardarCambios} cargando={procesando === editando.id}>
                <Save className="size-4" /> Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
