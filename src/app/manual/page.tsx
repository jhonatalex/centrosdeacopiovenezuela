"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Backpack,
  Phone,
  Home,
  TreePine,
  Car,
  ClipboardCheck,
} from "lucide-react";
import { Card, SectionHeader, cx } from "@/components/ui";

const secciones = [
  {
    id: "antes",
    titulo: "Antes del sismo — prepárate",
    icon: ClipboardCheck,
    items: [
      "Acuerda un plan familiar: punto de encuentro y un contacto fuera de la zona.",
      "Identifica las zonas seguras de tu casa (bajo mesas firmes, junto a muros de carga) y las de riesgo (ventanas, repisas, espejos).",
      "Fija a la pared estantes, televisores y objetos pesados.",
      "Ten lista la mochila de emergencia en un lugar accesible.",
      "Conoce dónde cortar el gas, el agua y la electricidad.",
      "Define y practica las rutas de evacuación hacia espacios abiertos.",
    ],
  },
  {
    id: "durante-casa",
    titulo: "Durante — dentro de un edificio",
    icon: Home,
    items: [
      "Agáchate, cúbrete y agárrate: protégete bajo una mesa resistente.",
      "Aléjate de ventanas, vidrios, fachadas y objetos que puedan caer.",
      "No uses el ascensor ni salgas corriendo por las escaleras durante el movimiento.",
      "Si estás en cama, protege tu cabeza con una almohada.",
      "Espera a que termine el movimiento para evacuar con calma.",
    ],
  },
  {
    id: "durante-calle",
    titulo: "Durante — en la calle",
    icon: TreePine,
    items: [
      "Dirígete a un espacio abierto, lejos de edificios, postes y cables.",
      "Cuidado con cornisas, vidrios y fachadas que se desprenden.",
      "No te acerques a muros ni bardas que puedan colapsar.",
    ],
  },
  {
    id: "durante-vehiculo",
    titulo: "Durante — en un vehículo",
    icon: Car,
    items: [
      "Reduce la velocidad y detente en un lugar seguro, lejos de puentes y postes.",
      "Permanece dentro del vehículo con el cinturón puesto hasta que pase.",
      "No te detengas debajo de puentes, pasos a desnivel ni cables.",
    ],
  },
  {
    id: "despues",
    titulo: "Después del sismo",
    icon: ClipboardCheck,
    items: [
      "Revisa si tú o alguien cercano está herido y presta primeros auxilios.",
      "Espera réplicas: pueden ser tan fuertes como el sismo principal.",
      "Si hay olor a gas, no enciendas luces ni fósforos; ventila y corta el suministro.",
      "Revisa daños estructurales antes de regresar (grietas en columnas o muros de carga).",
      "Usa el teléfono solo para emergencias; envía mensajes de texto en lugar de llamar.",
      "Mantente informado por radio y sigue las indicaciones de las autoridades.",
      "Si tu vivienda quedó dañada, dirígete al centro de acopio o refugio más cercano.",
    ],
  },
];

const mochila = [
  "Agua (4 litros por persona) y alimentos no perecederos",
  "Botiquín de primeros auxilios y medicamentos personales",
  "Linterna y baterías / cargador solar",
  "Radio a pilas",
  "Silbato para pedir ayuda",
  "Documentos importantes en bolsa impermeable",
  "Dinero en efectivo en billetes pequeños",
  "Ropa abrigada, frazada y artículos de aseo",
  "Copia de llaves y lista de contactos de emergencia",
];

const numeros = [
  { n: "171", q: "Emergencias / Protección Civil" },
  { n: "911", q: "Emergencias" },
  { n: "0800-BOMBEROS", q: "Bomberos" },
];

export default function ManualPage() {
  const [abierto, setAbierto] = useState<string | null>("antes");

  return (
    <div className="px-4 pb-10 pt-4">
      <SectionHeader
        titulo="Manual de seguridad sísmica"
        descripcion="Guía práctica de qué hacer antes, durante y después de un terremoto."
        icon={<BookOpen className="size-5" />}
        color="var(--sec-manual)"
      />

      {/* Acordeón */}
      <div className="mt-5 space-y-2.5">
        {secciones.map((s) => {
          const open = abierto === s.id;
          const Icon = s.icon;
          return (
            <Card key={s.id} className="overflow-hidden">
              <button
                onClick={() => setAbierto(open ? null : s.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-[var(--sec-manual)]">
                  <Icon className="size-5" />
                </span>
                <span className="flex-1 font-display font-bold">{s.titulo}</span>
                <ChevronDown className={cx("size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <ul className="space-y-2 border-t border-border px-4 py-3.5 text-sm text-foreground/90">
                  {s.items.map((it) => (
                    <li key={it} className="flex gap-2.5">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--sec-manual)]" />
                      {it}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      {/* Mochila de emergencia */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
          <Backpack className="size-5 text-[var(--sec-manual)]" /> Mochila de emergencia
        </h2>
        <Card className="p-4">
          <ul className="grid gap-2 sm:grid-cols-2">
            {mochila.map((m) => (
              <li key={m} className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--sec-manual)]" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Números de emergencia */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
          <Phone className="size-5 text-danger" /> Números de emergencia
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {numeros.map((x) => (
            <a key={x.n} href={`tel:${x.n.replace(/[^0-9]/g, "")}`}>
              <Card className="flex flex-col items-center gap-0.5 p-4 text-center active:scale-[0.98]">
                <span className="font-display text-xl font-bold text-danger">{x.n}</span>
                <span className="text-xs text-muted">{x.q}</span>
              </Card>
            </a>
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted-2">
        Contenido orientativo basado en recomendaciones de organismos de protección civil (ONEMI/SENAPRED).
        Sigue siempre las indicaciones oficiales de las autoridades locales.
      </p>
    </div>
  );
}
