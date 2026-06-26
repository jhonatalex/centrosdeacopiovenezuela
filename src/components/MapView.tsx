"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { Navigation, Star } from "lucide-react";
import type { Centro, GeoPunto } from "@/lib/types";

// Centro geográfico de Venezuela.
const VENEZUELA: GeoPunto = { lat: 7.9, lng: -66.2 };

/** Pin SVG en color según urgencia. */
function pin(color: string, urgente: boolean) {
  return L.divIcon({
    className: "acopio-pin",
    html: `
      <div style="position:relative;transform:translate(-50%,-100%);filter:drop-shadow(0 3px 4px rgba(0,0,0,.35))">
        <svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.06 0 0 8.06 0 18c0 12.6 18 28 18 28s18-15.4 18-28C36 8.06 27.94 0 18 0z" fill="${color}"/>
          <circle cx="18" cy="18" r="7" fill="white"/>
        </svg>
        ${urgente ? `<span style="position:absolute;top:-3px;right:-3px;width:13px;height:13px;border-radius:50%;background:#f15b5b;border:2px solid white"></span>` : ""}
      </div>`,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -42],
  });
}

const userIcon = L.divIcon({
  className: "acopio-pin",
  html: `<div style="transform:translate(-50%,-50%)"><span style="display:block;width:18px;height:18px;border-radius:50%;background:#6c7ff0;border:3px solid white;box-shadow:0 0 0 4px rgba(108,127,240,.3)"></span></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function Recenter({ punto, zoom }: { punto: GeoPunto | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (punto) map.flyTo([punto.lat, punto.lng], zoom ?? 14, { duration: 0.8 });
  }, [punto, zoom, map]);
  return null;
}

/** Permite seleccionar un punto haciendo clic (para el formulario de registro). */
function ClickHandler({ onPick }: { onPick?: (p: GeoPunto) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onPick) return;
    const fn = (e: L.LeafletMouseEvent) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.on("click", fn);
    return () => {
      map.off("click", fn);
    };
  }, [map, onPick]);
  return null;
}

export interface MapViewProps {
  centros: Centro[];
  miUbicacion?: GeoPunto | null;
  enfocar?: GeoPunto | null;
  /** Modo selección: clic en el mapa elige un punto (formulario). */
  onPick?: (p: GeoPunto) => void;
  puntoElegido?: GeoPunto | null;
  className?: string;
}

export default function MapView({
  centros,
  miUbicacion,
  enfocar,
  onPick,
  puntoElegido,
  className,
}: MapViewProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const iconElegido = useMemo(() => pin("#7c6cf0", false), []);

  return (
    <MapContainer
      center={[VENEZUELA.lat, VENEZUELA.lng]}
      zoom={6}
      scrollWheelZoom
      className={className}
      style={{ height: "100%", width: "100%" }}
      ref={setMap}
    >
      {map ? (
        <>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {centros.map((c) => {
            const urgente = c.necesita.length > 0;
            return (
              <Marker
                key={c.id}
                position={[c.ubicacion.lat, c.ubicacion.lng]}
                icon={pin(urgente ? "#15b8a6" : "#34c277", urgente)}
              >
                <Popup>
                  <div className="w-56 p-3 font-sans">
                    <p className="font-display text-sm font-bold text-foreground">{c.nombre}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {c.zona ? `${c.zona}, ` : ""}
                      {c.ciudad}
                    </p>
                    {typeof c.ratingProm === "number" && c.ratingCount ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-foreground">
                        <Star className="size-3 fill-accent text-accent" /> {c.ratingProm}
                        <span className="text-muted">({c.ratingCount})</span>
                      </p>
                    ) : null}
                    {c.necesita.length > 0 && (
                      <p className="mt-1.5 text-xs">
                        <span className="font-semibold text-danger">Necesita:</span>{" "}
                        {c.necesita.slice(0, 3).join(", ")}
                      </p>
                    )}
                    <Link
                      href={`/centro?id=${c.id}`}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {miUbicacion && <Marker position={[miUbicacion.lat, miUbicacion.lng]} icon={userIcon} />}
          {puntoElegido && <Marker position={[puntoElegido.lat, puntoElegido.lng]} icon={iconElegido} />}

          <Recenter punto={enfocar ?? miUbicacion ?? null} />
          <ClickHandler onPick={onPick} />
        </>
      ) : null}
    </MapContainer>
  );
}
