# 📘 Contexto del proyecto — Centros de Acopio Venezuela

> Documento de traspaso (handoff). Resume **todo** lo construido desde el inicio.
> Si abres este proyecto con Claude Code en otra cuenta/equipo, **lee este archivo primero**.
> Para que se cargue automáticamente cada sesión, puedes referenciarlo desde `AGENTS.md`.

---

## 1. Qué es

Plataforma web **mobile-first** tipo mapa para **ayuda en emergencias en Venezuela**
(terremoto/sismos). Permite a la comunidad ubicar y registrar recursos de ayuda.
Salió mencionada en **Caracol Noticias**.

**Secciones / módulos:**
1. **Mapa + Centros de acopio** — registro con fotos, qué necesita / qué dona, moderación por admin, reseñas con login Google.
2. **Asistencia Médica** — banco de medicamentos (con búsqueda por voz) + registro de personas/pacientes con **formulario inteligente** (hospitalizado vs. no) + **1734 pacientes hospitalizados** importados.
3. **Rescate** — reportes de personas atrapadas con estado resuelto.
4. **Prevención sísmica** — grietas peligrosas vs. seguras (con fotos ampliables), qué hacer en réplicas, buscador de familiares por ubicación.
5. **Manual de seguridad** — guía antes/durante/después, mochila de emergencia, números.
6. **Admin** — moderación de centros, gestión de usuarios, solicitudes de responsabilidad, panel **WhaiBot** (WhatsApp/plantillas) y **API keys** para exponer datos.

---

## 2. Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS v4** (config en `src/app/globals.css` con `@theme`)
- **Leaflet** + OpenStreetMap (mapas) — `src/components/MapView.tsx`, siempre `dynamic(..., { ssr:false })`
- **Firebase**: Firestore (datos), Auth (Google), Storage (fotos)
- **Resend** (emails) — `src/lib/email.ts` (requiere `RESEND_API_KEY`)
- Fuentes: **Fredoka** (display) + **Nunito** (body)

---

## 3. Diseño — Claymorphism 🎨

Estética cálida/amigable (pastel candy, elementos "inflados"). Tokens en `globals.css`:
- Sombras clay: utilidades `.clay`, `.clay-sm`, `.clay-btn`, `.clay-inset`, `.clay-float`.
- Colores por sección: `--sec-acopio` (teal), `--sec-medicos` (morado), `--sec-rescate` (rojo), `--sec-prevencion` (ámbar), `--sec-manual` (slate).
- Bordes grandes (~28–30px), modo claro/oscuro, `prefers-reduced-motion`.
- Kit UI reutilizable en `src/components/ui.tsx` (Button, Card, Field, Input, ChipInput, Badge, StarRating, EmptyState, Spinner, SectionHeader).

---

## 4. Capa de datos

`src/lib/db.ts` es la **capa unificada**:
- Si **hay** Firebase configurado (`.env.local`) → usa **Firestore + Storage**.
- Si **no** → **modo demo** (localStorage). `esDemo` lo indica.
- Helper `limpiarUndefined()` evita escribir `undefined` en Firestore.

**Colecciones Firestore:**
- `centros` — centros de acopio (estado: pendiente/aprobado/rechazado).
- `reviews` — reseñas de centros.
- `medicos` — **personas/pacientes** (unificado). Si `hospitalizado:true` lleva `hospital` (+`area`); si no, dirección. Aquí están los 1734 importados.
- `medicamentos` — banco de medicamentos.
- `rescates` — solicitudes de rescate.
- `balizas` — ubicaciones compartidas para reencuentro familiar.
- `usuarios`, `solicitudes` (responsabilidad de centros), config de WhaiBot, `apiKeys`.

Tipos en `src/lib/types.ts`. `RegistroMedico` se extendió con: `hospitalizado, hospital, area, apellido, genero, estadoSalud, foto, ubicacion`.

---

## 5. Firebase / Infraestructura

- **Proyecto Firebase:** `centrosdeacopiovenezuela`
- **Config web** (pública) en `.env.local` (NO se commitea). Variables `NEXT_PUBLIC_FIREBASE_*` + `NEXT_PUBLIC_ADMIN_EMAILS`.
- **Admins:** hardcoded en `src/lib/firebase.ts` (`neptalyx@gmail.com`, `dirsdeveloper@gmail.com`, `marketglobaldeveloper@gmail.com`) + los de `NEXT_PUBLIC_ADMIN_EMAILS` (incluye `jhonatanmejias@gmail.com`).
- **Firestore:** en **modo de prueba (abierto)**. ⚠️ Pendiente endurecer reglas (`firestore.rules`) antes de producción seria — pero ojo: las consultas hacen `getDocs` de colecciones completas, así que reglas restrictivas por documento romperían el mapa salvo que se filtren las queries (`where('estado','==','aprobado')`).

### Despliegue — IMPORTANTE
**Solo se usa FIREBASE APP HOSTING** (build de servidor, soporta SSR + API routes).
- URL viva: `https://centrosdeacopiovenezuela--centrosdeacopiovenezuela.us-east4.hosted.app`
- Backend App Hosting: `centrosdeacopiovenezuela` (región `us-east4`, runtime nodejs22).
- **Se redeploya solo en cada push a `main`.** Rollout manual:
  `firebase apphosting:rollouts:create centrosdeacopiovenezuela --git-commit <sha> --force`
- Variables de entorno (incluida `RESEND_API_KEY` secreta y las `NEXT_PUBLIC_*`) se configuran en la **consola de App Hosting** con disponibilidad **Build + Runtime** (las `NEXT_PUBLIC_*` deben estar en Build o sale "modo demo").

⚠️ **`centrosdeacopiovenezuela.web.app` (Hosting estático) quedó OBSOLETO.** La app tiene API routes dinámicas (`/api/hospitalizados`, `/api/email`, `/api/resolve-map`) incompatibles con `output: "export"`. NO intentar build estático. Si se quiere usar el dominio `web.app`, conectarlo al backend de App Hosting desde la consola (Hosting → conectar backend). `next.config.ts` **NO** debe llevar `output: "export"`.

---

## 6. Módulo Asistencia Médica (el más reciente)

- **Fuente de datos scrapeada:** `https://asistencia-medica-fvivemas.web.app/` — su Firestore (proyecto `asistencia-medica-fvivemas`), colección **`medical_cases`** (1734 pacientes, campos: name, lastName, idCard, hospitalName, coordinates, diagnosis, healthStatus, gender, age, contact).
- **Scripts** (`scripts/`):
  - `export-hospitalizaciones.mjs` — baja y normaliza los pacientes vía REST de Firestore → `scripts/hospitalizaciones-data.json` (gitignored, regenerable).
  - `importar-hospitalizaciones-firebase.mjs` — importa ese JSON a NUESTRA Firebase (`medicos`, `hospitalizado:true`, id `hosp-<id>`, batch de 500).
  - `seed-firestore.mjs` — datos de prueba iniciales (centros/medicamentos/rescates).
- **UI** (`src/app/medicos/page.tsx`): pestañas Medicamentos / Personas. La de Personas centraliza todo:
  - Formulario inteligente: toggle "¿hospitalizado?" → centro de salud + área; foto opcional.
  - Lista en **filas** (avatar + nombre + tag de hospital) con búsqueda (nombre/cédula/hospital/ciudad), paginador y **modal de detalle**.
- **Home:** botón "Asistencia Médica"; mapa muestra **hospitales** (agrupados por nombre) con ícono y conteo de pacientes; métrica "Hospitalizados" (1734) en las estadísticas.
- **Modelo:** todo en una sola colección `medicos`; el flag `hospitalizado` separa para informes.

---

## 7. Git / repositorio

- **Repo:** `github.com/jhonatalex/centrosdeacopiovenezuela`, rama `main`.
- **Acceso SSH:** alias `gh-acopio` en `~/.ssh/config` con la llave `~/.ssh/id_acopio` (se generó dedicada porque la llave por defecto ya estaba en otra cuenta). Remoto: `git@gh-acopio:jhonatalex/centrosdeacopiovenezuela.git`.
- ⚠️ **Preferencia del dueño:** NO incluir atribución a Claude/IA en commits ni PRs (sin `Co-Authored-By`).
- Trabajan **varios colaboradores en paralelo** (ramas `david`, `medicina`); `main` avanza seguido. **Siempre `git fetch` + `git pull --rebase` antes de pushear.** A veces entran bugs por merge (p. ej. imports faltantes) — verificar con `npm run build` antes de desplegar.

---

## 8. Gotchas / aprendizajes

1. **No usar `output: "export"`** — rompe el build por las API routes dinámicas. App Hosting hace build de servidor.
2. Si el build falla por **"Cannot find name X"** → import faltante de lucide-react (común tras merges). Agregarlo.
3. Si falla por **"Module not found"** → correr `npm install` (un compañero agregó una dependencia, p.ej. `resend`).
4. **Leaflet** solo en cliente (`dynamic ssr:false`). Las teselas del mapa pueden colgar la herramienta de screenshot del preview — verificar con `preview_eval`/snapshot en vez de screenshot.
5. Firestore: usar `limpiarUndefined` o filtrar `undefined` antes de escribir.
6. El sitio corre en `preview_start` puerto 3010 (config en `.claude/launch.json` del workspace).

---

## 9. Pendientes sugeridos

- [ ] Endurecer reglas de Firestore (y ajustar queries a `where` para no romper lecturas públicas).
- [ ] Conectar dominio `web.app` (o un dominio propio) al backend de App Hosting.
- [ ] Optimizar: el home lee TODOS los `medicos` (1734+) para agrupar hospitales — considerar agregación/caché.
- [ ] La API `/api/resolve-map` tiene `force-static` (vestigio del export estático); en App Hosting podría quitarse para que resuelva links de Google Maps de verdad.

---

_Última actualización: traspaso de cuenta. La app está viva en App Hosting con todos los módulos funcionando._
