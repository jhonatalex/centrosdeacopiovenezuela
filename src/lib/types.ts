// Modelos de dominio compartidos en toda la app.

export type EstadoModeracion = "pendiente" | "aprobado" | "rechazado";

export interface GeoPunto {
  lat: number;
  lng: number;
}

/** Centro de acopio */
export interface Centro {
  id: string;
  nombre: string;
  fotos: string[]; // dataURLs o URLs de Storage (1 a 3)
  direccion: string;
  direccionManual?: boolean;
  ciudad: string;
  zona?: string; // zona / parroquia / sector
  institucion?: string;
  contactoCentro: string; // teléfono(s) del centro
  ubicacion: GeoPunto;
  // Inventario
  necesita: string[]; // lo que se necesita con urgencia
  sobra: string[]; // lo que se puede compartir / donar
  descripcion?: string;
  // Registrador (privado, sólo visible para admin, o creadorUid para el dueño)
  registradorNombre?: string;
  registradorContacto?: string;
  creadorUid?: string; // UID del usuario que registró el centro
  registradorUid?: string;
  registradorEmail?: string;
  // Moderación
  estado: EstadoModeracion;
  motivoRechazo?: string;
  creadoEn: number; // epoch ms
  // Calificaciones agregadas
  ratingProm?: number;
  ratingCount?: number;
}

/** Reseña / calificación (requiere login con Google) */
export interface Review {
  id: string;
  centroId: string;
  autorUid: string;
  autorNombre: string;
  autorFoto?: string;
  rating: number; // 1..5
  texto: string;
  creadoEn: number;
}

/** Registro médico: persona con tratamiento */
export interface RegistroMedico {
  id: string;
  nombre: string;
  edad?: number;
  cedula?: string; // identidad básica (opcional)
  patologia: string; // enfermedad
  tratamiento: string; // qué tratamiento usa
  posologia?: string; // cada cuánto lo toma
  tratamientosAdicionales?: {
    patologia: string;
    tratamiento: string;
    posologia?: string;
  }[];
  condicionesMedicas?: {
    patologia: string;
    medicamentos: {
      nombre: string;
      posologia?: string;
    }[];
  }[];
  ciudad: string;
  municipio?: string;
  parroquia?: string;
  direccion?: string;
  telefono: string;
  creadoEn: number;
  creadorEmail?: string;
}

/** Banco de medicamentos para donar */
export interface Medicamento {
  id: string;
  nombre: string;
  presentacion?: string; // ej. "500mg comprimidos"
  cantidad: number; // contador disponible
  ciudad: string;
  municipio?: string;
  parroquia?: string;
  direccion?: string;
  ubicacionTexto: string; // dónde retirarlo
  contacto: string;
  creadoEn: number;
  creadorEmail?: string;
}

/** Solicitud de rescate */
export interface Rescate {
  id: string;
  direccion: string;
  representante: string; // quién representa / reporta
  telefono: string;
  detalle?: string;
  personasAtrapadas?: number;
  ubicacion?: GeoPunto;
  resuelto: boolean;
  creadoEn: number;
}

/** Baliza de ubicación de un usuario (buscar familiar) */
export interface Baliza {
  id: string; // = codigoFamilia + nombre
  codigoFamilia: string;
  nombre: string;
  ubicacion: GeoPunto;
  mensaje?: string;
  actualizadoEn: number;
}

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  foto?: string;
  esAdmin: boolean;
}

export interface SolicitudResponsabilidad {
  id: string;
  centroId: string;
  centroNombre: string;
  solicitanteUid: string;
  solicitanteNombre: string;
  solicitanteEmail: string;
  solicitanteContacto: string;
  creadoEn: number;
  estado: "pendiente" | "aceptada" | "rechazada";
}

/** Credenciales de WhaiBot para envío de mensajes vía API */
export interface WhaibotConfig {
  botId: string;    // x-client-botid
  apiKey: string;   // x-client-key (clientKey)
  updatedAt: number;
}

/** Plantilla de mensaje de WhatsApp */
export interface WhaibotPlantilla {
  id: string;
  nombre: string;       // Ej: "Alerta de suministros"
  mensaje: string;      // Texto del mensaje (puede incluir {nombre})
  mediaUrl?: string;    // URL de imagen opcional
  creadoEn: number;
}

