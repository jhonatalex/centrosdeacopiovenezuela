"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, HeartPulse, LifeBuoy, ShieldAlert, BookOpen } from "lucide-react";
import { cx } from "./ui";

const items = [
  { href: "/", label: "Mapa", icon: Map, color: "var(--sec-acopio)" },
  { href: "/medicos", label: "Médicos", icon: HeartPulse, color: "var(--sec-medicos)" },
  { href: "/rescate", label: "Rescate", icon: LifeBuoy, color: "var(--sec-rescate)" },
  { href: "/prevencion", label: "Prevención", icon: ShieldAlert, color: "var(--sec-prevencion)" },
  { href: "/manual", label: "Manual", icon: BookOpen, color: "var(--sec-manual)" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="z-[1000] shrink-0 border-t border-border bg-surface/90 backdrop-blur-md pb-safe"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-1">
        {items.map(({ href, label, icon: Icon, color }) => {
          const activo = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                className={cx(
                  "mx-auto flex min-h-[58px] w-full max-w-[72px] flex-col items-center justify-center gap-1 rounded-[1.1rem] px-1 py-1.5 text-[11px] font-semibold transition-all",
                  activo ? "bg-surface text-foreground clay-sm" : "text-muted-2 hover:text-muted",
                )}
              >
                <span
                  className={cx(
                    "grid size-8 place-items-center rounded-full transition-colors",
                    activo && "text-white",
                  )}
                  style={activo ? { background: color } : undefined}
                >
                  <Icon className="size-[18px]" strokeWidth={2.4} aria-hidden />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
