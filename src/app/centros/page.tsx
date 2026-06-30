"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, MapPin, Star, Building2, Loader2, ArrowLeft } from "lucide-react";
import { listarCentrosAprobados } from "@/lib/db";
import type { Centro } from "@/lib/types";
import { Badge, Paginator } from "@/components/ui";

export default function CentrosPage() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    listarCentrosAprobados(500)
      .then((c) => setCentros(c))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, itemsPerPage]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return centros;
    return centros.filter((c) =>
      [c.nombre, c.ciudad, c.zona, ...c.necesita, ...c.sobra]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(t)),
    );
  }, [centros, q]);

  const paginatedCentros = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtrados.slice(startIndex, startIndex + itemsPerPage);
  }, [filtrados, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtrados.length / itemsPerPage);

  return (
    <div className="space-y-5 px-4 pb-10 pt-4">
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver al mapa
      </Link>

      <div className="flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--sec-acopio)] text-white shadow-sm clay-float">
          <Building2 className="size-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight">Centros de Acopio</h1>
          <p className="text-sm text-muted">Directorio completo de puntos de recolección</p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar ciudad, zona o suministro…"
          className="h-12 w-full rounded-2xl bg-surface pl-10 pr-4 text-sm clay-inset placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-primary/45"
        />
      </div>

      {cargando ? (
        <div className="py-10 text-center text-sm text-muted flex flex-col items-center">
          <Loader2 className="size-6 animate-spin mb-2" />
          Cargando directorio…
        </div>
      ) : filtrados.length === 0 ? (
        <p className="rounded-2xl bg-surface p-4 text-sm text-muted clay-sm">
          No se encontraron centros de acopio.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {paginatedCentros.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/centro/${c.id}`}
                  className="block rounded-[1.5rem] bg-surface p-4 clay-sm transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-foreground">{c.nombre}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <MapPin className="size-3.5" />
                        {c.zona ? `${c.zona}, ` : ""}
                        {c.ciudad}
                      </p>
                    </div>
                    {c.ratingCount ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm">
                        <Star className="size-4 fill-accent text-accent" />
                        {c.ratingProm}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {c.necesita.slice(0, 3).map((n) => (
                      <Badge key={n} tono="danger">
                        {n}
                      </Badge>
                    ))}
                    {c.sobra.slice(0, 2).map((s) => (
                      <Badge key={s} tono="success">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {filtrados.length > 0 && (
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
    </div>
  );
}
