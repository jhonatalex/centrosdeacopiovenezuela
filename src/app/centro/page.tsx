"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Star,
  Building2,
  MessageSquarePlus,
  Loader2,
  LogIn,
} from "lucide-react";
import {
  obtenerCentro,
  listarReviews,
  crearReview,
  nuevoId,
} from "@/lib/db";
import { useAuth } from "@/lib/auth";
import type { Centro, Review } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Spinner,
  StarRating,
  Textarea,
  EmptyState,
} from "@/components/ui";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

function Detalle() {
  const id = useSearchParams().get("id") ?? "";
  const { usuario, iniciarSesion } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fotoActiva, setFotoActiva] = useState(0);

  const [rating, setRating] = useState(5);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function recargar() {
    const c = await obtenerCentro(id);
    setCentro(c);
    if (c) setReviews(await listarReviews(c.id));
    setCargando(false);
  }

  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function enviarReview() {
    if (!usuario || !centro || !texto.trim()) return;
    setEnviando(true);
    try {
      await crearReview({
        id: nuevoId(),
        centroId: centro.id,
        autorUid: usuario.uid,
        autorNombre: usuario.nombre,
        autorFoto: usuario.foto,
        rating,
        texto: texto.trim(),
        creadoEn: Date.now(),
      });
      setTexto("");
      setRating(5);
      await recargar();
    } finally {
      setEnviando(false);
    }
  }

  const noAprobado = centro?.estado !== "aprobado";
  const esAdmin = usuario?.esAdmin;

  if (cargando) return <Spinner label="Cargando centro…" />;
  if (!centro || (noAprobado && !esAdmin))
    return (
      <div className="px-4 pt-8">
        <EmptyState
          titulo="Centro no disponible"
          detalle={
            !centro
              ? "Puede que el centro de acopio haya sido removido."
              : "El centro de acopio aún no ha sido aprobado por un administrador."
          }
          accion={
            <Link href="/">
              <Button variant="secondary">Volver al mapa</Button>
            </Link>
          }
        />
      </div>
    );

  return (
    <div className="pb-10">
      {/* Galería */}
      <div className="relative aspect-[16/10] w-full bg-surface-2">
        {centro.fotos.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={centro.fotos[fotoActiva]} alt={centro.nombre} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-2">
            <Building2 className="size-12" />
          </div>
        )}
        <Link
          href="/"
          className="absolute left-3 top-3 grid size-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
          aria-label="Volver"
        >
          <ArrowLeft className="size-5" />
        </Link>
        {centro.fotos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {centro.fotos.map((_, i) => (
              <button
                key={i}
                onClick={() => setFotoActiva(i)}
                aria-label={`Foto ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === fotoActiva ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5 px-4 pt-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-bold leading-tight">{centro.nombre}</h1>
            {centro.ratingCount ? (
              <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
                <Star className="size-4 fill-accent text-accent" />
                {centro.ratingProm}
                <span className="font-normal text-muted">({centro.ratingCount})</span>
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-4" /> {centro.direccion}
            {centro.zona ? `, ${centro.zona}` : ""}, {centro.ciudad}
          </p>
          {centro.institucion && (
            <p className="mt-1 text-sm text-muted">Responsable: {centro.institucion}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {centro.contactoCentro.split(",").map((tel, idx) => {
            const t = tel.trim();
            if (!t) return null;
            return (
              <a key={idx} href={`tel:${t}`} className="w-full">
                <Button full size="lg" className="w-full">
                  <Phone className="size-5" /> Llamar al centro {centro.contactoCentro.includes(",") ? `(${t})` : ""}
                </Button>
              </a>
            );
          })}
        </div>

        <br />
        <br />

        {(centro.necesita.length > 0 || centro.sobra.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {centro.necesita.length > 0 && (
              <Card className="p-4">
                <p className="mb-2 text-sm font-semibold text-danger">Necesita con urgencia</p>
                <div className="flex flex-wrap gap-1.5">
                  {centro.necesita.map((n) => (
                    <Badge key={n} tono="danger">{n}</Badge>
                  ))}
                </div>
              </Card>
            )}
            {centro.sobra.length > 0 && (
              <Card className="p-4">
                <p className="mb-2 text-sm font-semibold text-success">Puede compartir / dona</p>
                <div className="flex flex-wrap gap-1.5">
                  {centro.sobra.map((s) => (
                    <Badge key={s} tono="success">{s}</Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {centro.descripcion && (
          <div>
            <h2 className="mb-1 font-display font-bold">Detalles</h2>
            <p className="text-sm leading-relaxed text-foreground/90">{centro.descripcion}</p>
          </div>
        )}

        {/* Mini mapa */}
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="h-48">
            <MapView centros={[centro]} enfocar={centro.ubicacion} />
          </div>
        </div>

        {/* Reseñas */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <MessageSquarePlus className="size-5 text-primary" /> Opiniones
          </h2>

          {usuario ? (
            <Card className="mb-4 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium">Tu calificación:</span>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Cuenta tu experiencia para ayudar a otros…"
              />
              <div className="mt-2 flex justify-end">
                <Button onClick={enviarReview} cargando={enviando} disabled={!texto.trim()}>
                  Publicar opinión
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="mb-4 flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted">Inicia sesión con Google para dejar tu opinión.</p>
              <Button size="sm" variant="secondary" onClick={iniciarSesion}>
                <LogIn className="size-4" /> Entrar
              </Button>
            </Card>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay opiniones. Sé el primero.</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-2">
                    {r.autorFoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.autorFoto} alt="" className="size-8 rounded-full" />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-primary text-on-primary text-xs font-bold">
                        {r.autorNombre.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{r.autorNombre}</p>
                      <StarRating value={r.rating} readOnly size={14} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-foreground/90">{r.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default function CentroPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Detalle />
    </Suspense>
  );
}
