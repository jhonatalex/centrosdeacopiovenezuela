import { MessageCircle } from "lucide-react";

const contactos = [
  { label: "+56 9 4162 3264", url: "https://wa.me/56941623264" },
  { label: "+58 426 869 1664", url: "https://wa.me/584268691664" },
  { label: "+56 9 6488 9756", url: "https://wa.me/56964889756" },
  { label: "+57 301 324 9498", url: "https://wa.me/573013249498" },
];

export default function Footer() {
  const whatsappUrl = "https://wa.me/56941623264"; // Defaulting to one of the numbers, or we can just link to one of them

  return (
    <footer className="mt-8 mb-20 px-4 text-center">
      <div className="rounded-[1.5rem] bg-surface p-6 clay-sm">
        <div className="flex flex-col items-center justify-center gap-3">
          <p className="text-sm font-medium text-foreground">
            ¿Encontraste un problema? Repórtalo aquí:
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            <a
              href="https://wa.me/56941623264"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95"
            >
              <MessageCircle className="size-4" />
              +56 9 4162 3264
            </a>
            <a
              href="https://wa.me/584245435637"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95"
            >
              <MessageCircle className="size-4" />
              +58 424 5435637
            </a>
            <a
              href="https://wa.me/56964889756"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95"
            >
              <MessageCircle className="size-4" />
              +56 9 6488 9756
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
