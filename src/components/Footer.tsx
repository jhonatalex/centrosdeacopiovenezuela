import { MessageCircle } from "lucide-react";

const contactos = [
  { label: "+56 9 4162 3264", url: "https://wa.me/56941623264" },
  { label: "+58 424 543 5637", url: "https://wa.me/584245435637" },
  { label: "+56 9 6488 9756", url: "https://wa.me/56964889756" },
  { label: "+57 301 324 9498", url: "https://wa.me/573013249498" },
];

export default function Footer() {
  return (
    <footer className="mt-8 mb-20 px-4 text-center">
      <div className="rounded-[1.5rem] bg-surface p-6 clay-sm">
        <div className="flex flex-col items-center justify-center gap-3">
          <p className="text-sm font-medium text-foreground">
            ¿Encontraste un problema? Repórtalo aquí:
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {contactos.map((c) => (
              <a
                key={c.url}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95"
              >
                <MessageCircle className="size-4" />
                {c.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

