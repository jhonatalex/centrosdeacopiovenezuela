"use client";

import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Loader2, Star, X } from "lucide-react";

function cx(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

/* ----------------------------- Button ----------------------------- */

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variantes: Record<Variant, string> = {
  primary: "bg-primary text-on-primary clay-btn active:clay-btn-pressed",
  secondary: "bg-surface text-foreground clay-sm active:clay-btn-pressed",
  danger: "bg-danger text-white clay-btn active:clay-btn-pressed",
  outline: "bg-surface text-primary clay-sm active:clay-btn-pressed",
  ghost: "bg-transparent text-foreground hover:bg-surface-2",
};
const tamanos: Record<Size, string> = {
  sm: "h-10 px-4 text-sm gap-1.5",
  md: "h-12 px-5 text-[15px] gap-2",
  lg: "h-14 px-6 text-base gap-2",
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  cargando?: boolean;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", size = "md", cargando, full, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || cargando}
      className={cx(
        "inline-flex items-center justify-center rounded-full font-display font-semibold transition-[transform,box-shadow,filter] duration-150 cursor-pointer select-none active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantes[variant],
        tamanos[size],
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {cargando && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/* ----------------------------- Card ----------------------------- */

export function Card({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-[1.75rem] bg-surface clay", className)} {...rest}>
      {children}
    </div>
  );
}

/* ----------------------------- Badge ----------------------------- */

type Tono = "neutral" | "primary" | "danger" | "success" | "warning" | "info";
const tonos: Record<Tono, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  primary: "bg-primary-soft text-primary-strong border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-accent-soft text-warning border-transparent",
  info: "bg-info-soft text-info border-transparent",
};

export function Badge({
  children,
  tono = "neutral",
  className,
}: {
  children: ReactNode;
  tono?: Tono;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        tonos[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------- Field / Input / Textarea ----------------------------- */

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && (
        <span className="mt-1 block text-xs font-medium text-danger" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

const inputBase =
  "w-full rounded-2xl bg-surface px-4 text-[15px] text-foreground placeholder:text-muted-2 clay-inset transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/45";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cx(inputBase, "h-12", className)} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cx(inputBase, "py-3 min-h-[88px] resize-y", className)} {...rest} />;
  },
);

/* ----------------------------- ChipInput (etiquetas necesita/sobra) ----------------------------- */

export function ChipInput({
  valores,
  onChange,
  placeholder,
  tono = "neutral",
  sugerencias = [],
}: {
  valores: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  tono?: Tono;
  sugerencias?: string[];
}) {
  const [texto, setTexto] = useState("");
  function agregar(v: string) {
    const t = v.trim();
    if (t && !valores.includes(t)) onChange([...valores, t]);
    setTexto("");
  }
  const dispo = sugerencias.filter((s) => !valores.includes(s));
  return (
    <div>
      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar(texto);
            }
          }}
          placeholder={placeholder}
          className={cx(inputBase, "h-12")}
        />
        <Button type="button" variant="secondary" size="md" onClick={() => agregar(texto)}>
          Añadir
        </Button>
      </div>
      {dispo.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {dispo.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => agregar(s)}
              className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted hover:border-primary hover:text-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      {valores.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {valores.map((v) => (
            <span
              key={v}
              className={cx(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                tonos[tono],
              )}
            >
              {v}
              <button
                type="button"
                aria-label={`Quitar ${v}`}
                onClick={() => onChange(valores.filter((x) => x !== v))}
                className="rounded-full hover:bg-black/10 p-0.5"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- StarRating ----------------------------- */

export function StarRating({
  value,
  onChange,
  size = 20,
  readOnly,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          aria-label={`${n} estrellas`}
          onClick={() => onChange?.(n)}
          className={cx(!readOnly && "cursor-pointer", "p-0.5")}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? "fill-accent text-accent" : "text-border"}
          />
        </button>
      ))}
    </div>
  );
}

/* ----------------------------- EmptyState / Spinner ----------------------------- */

export function EmptyState({
  icon,
  titulo,
  detalle,
  accion,
}: {
  icon?: ReactNode;
  titulo: string;
  detalle?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface-2 px-6 py-12 text-center">
      {icon && <div className="text-muted-2">{icon}</div>}
      <div>
        <p className="font-display font-semibold text-foreground">{titulo}</p>
        {detalle && <p className="mt-1 text-sm text-muted">{detalle}</p>}
      </div>
      {accion}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-muted">
      <Loader2 className="size-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

/* ----------------------------- SectionHeader ----------------------------- */

export function SectionHeader({
  titulo,
  descripcion,
  icon,
  color = "var(--primary)",
}: {
  titulo: string;
  descripcion?: string;
  icon?: ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div
          className="grid size-12 shrink-0 place-items-center rounded-[1.3rem] text-white clay-btn"
          style={{ background: color }}
        >
          {icon}
        </div>
      )}
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">{titulo}</h1>
        {descripcion && <p className="mt-0.5 text-sm text-muted">{descripcion}</p>}
      </div>
    </div>
  );
}

/* ----------------------------- Paginator ----------------------------- */

export function Paginator({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  options = [15, 25, 50],
  cargando = false,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (limit: number) => void;
  options?: number[];
  cargando?: boolean;
}) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-4 border-t border-border/10 pt-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted">Mostrar:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="rounded-lg bg-surface px-2 py-1.5 text-sm font-medium text-foreground clay-inset focus:outline-none focus:ring-2 focus:ring-primary/45"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt} por página
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || cargando}
          className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium disabled:opacity-50 clay-btn active:scale-95 transition-transform"
        >
          Anterior
        </button>
        <span className="text-sm font-medium text-muted min-w-[80px] text-center">
          {currentPage} / {totalPages > 0 ? totalPages : 1}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0 || cargando}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-surface px-3 py-1.5 text-sm font-medium disabled:opacity-50 clay-btn active:scale-95 transition-transform"
        >
          Siguiente
          {cargando && <Loader2 className="size-3 animate-spin" />}
        </button>
      </div>
    </div>
  );
}

export { cx };
