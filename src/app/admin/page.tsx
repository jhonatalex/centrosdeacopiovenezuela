"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { listarCentros, moderarCentro } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import type { Centro, EstadoModeracion } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
  Spinner,
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
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<EstadoModeracion>("pendiente");
  const [procesando, setProcesando] = useState<string | null>(null);

  async function recargar() {
    setCentros(await listarCentros());
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
      await recargar();
    } finally {
      setProcesando(null);
    }
  }

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

      <div className="mt-4 flex gap-2">
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
      </div>

      {cargando ? (
        <Spinner />
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

              {c.estado === "pendiente" && (
                <div className="flex gap-2 border-t border-border p-3">
                  <Button
                    variant="secondary"
                    full
                    cargando={procesando === c.id}
                    onClick={() => moderar(c.id, "rechazado")}
                  >
                    <X className="size-4 text-danger" /> Rechazar
                  </Button>
                  <Button full cargando={procesando === c.id} onClick={() => moderar(c.id, "aprobado")}>
                    <Check className="size-4" /> Aprobar
                  </Button>
                </div>
              )}
              {c.estado !== "pendiente" && (
                <div className="border-t border-border px-4 py-2">
                  <Link
                    href={c.estado === "aprobado" ? `/centro?id=${c.id}` : "#"}
                    className="text-xs font-medium text-primary"
                  >
                    {c.estado === "aprobado" ? "Ver en público →" : ""}
                  </Link>
                </div>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
