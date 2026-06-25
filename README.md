# Centros de Acopio · Venezuela 🤝

Plataforma web **mobile-first** tipo mapa para ayuda en situaciones de emergencia en Venezuela.
Permite ubicar y registrar centros de acopio, coordinar tratamientos médicos y donación de
medicamentos, solicitar rescates y consultar prevención sísmica.

Diseño **claymorphism** (pastel, amigable, accesible) con Next.js + Tailwind + Leaflet + Firebase.

## Funcionalidades

- 🗺️ **Mapa de centros de acopio** (Leaflet + OpenStreetMap) con marcadores y búsqueda.
- 🏠 **Registro de centros**: fotos (hasta 3), dirección, ubicación en mapa, qué necesita / qué dona, datos privados del registrador.
- ✅ **Moderación**: los centros se aprueban manualmente desde el panel de administrador.
- ⭐ **Reseñas y calificaciones** con inicio de sesión de Google.
- 💊 **Tratamientos médicos**: registro de personas + banco de medicamentos con contador y **búsqueda por voz**.
- 🛟 **Rescate**: reporte de personas atrapadas con seguimiento de estado.
- 🛡️ **Prevención sísmica**: grietas peligrosas vs. seguras, qué hacer en réplicas y **buscador de familiares** por ubicación.
- 📖 **Manual de seguridad** (antes / durante / después, mochila de emergencia, números útiles).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, export estático) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Leaflet](https://leafletjs.com) + OpenStreetMap
- [Firebase](https://firebase.google.com): Firestore, Auth (Google) y Storage
- Despliegue en **Firebase Hosting** (`*.web.app`)

## Desarrollo local

```bash
npm install
npm run dev
```

Sin variables de entorno, la app corre en **modo demo** (datos de ejemplo guardados en el navegador).

## Configurar Firebase (producción)

1. Crea un proyecto en la [consola de Firebase](https://console.firebase.google.com) y habilita **Firestore**, **Authentication (Google)** y **Storage**.
2. Copia `.env.local.example` a `.env.local` y rellena las credenciales del proyecto.
3. Define los correos administradores en `NEXT_PUBLIC_ADMIN_EMAILS` (y en `firestore.rules`).

## Desplegar en Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # selecciona tu proyecto
npm run build                 # genera la carpeta /out (export estático)
firebase deploy               # publica hosting + reglas de Firestore/Storage
```

`firebase.json` ya apunta a `out/` como carpeta pública e incluye las reglas de
Firestore (`firestore.rules`) y Storage (`storage.rules`).

---

Hecho con ❤️ para ayudar en emergencias.
