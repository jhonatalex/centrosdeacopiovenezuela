import Link from "next/link";
import { MessageCircle } from "lucide-react"; // using MessageCircle as fallback for WhatsApp if lucide-react doesn't have a direct whatsapp icon

export default function Footer() {
  const whatsappUrl = "https://wa.me/56941623264"; // Defaulting to one of the numbers, or we can just link to one of them
  
  return (
    <footer className="mt-8 mb-20 px-4 text-center">
      <div className="rounded-[1.5rem] bg-surface p-6 clay-sm">
        <p className="text-sm text-foreground font-medium mb-2">
          ¿Quiénes somos?{" "}
          <a
            href="https://www.globaltechfactory.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Global Tech
          </a>
        </p>
        <p className="text-xs text-muted mb-1">
          © 2026 Global Tech. Todos los derechos reservados.
        </p>
        <p className="text-xs text-muted mb-2">
          <a href="https://globaltechnologies.web.app" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            globaltechnologies.web.app
          </a>
        </p>

        <div className="flex flex-col items-center justify-center gap-2 border-t border-border/10 pt-2 mt-1">
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
              href="https://wa.me/584268691664"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95"
            >
              <MessageCircle className="size-4" />
              +58 426 8691664
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
