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
  // Registrador (privado, sólo visible para admin)
  registradorNombre?: string;
  registradorContacto?: string;
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
  ciudad: string;
  telefono: string;
  creadoEn: number;
}

/** Banco de medicamentos para donar */
export interface Medicamento {
  id: string;
  nombre: string;
  presentacion?: string; // ej. "500mg comprimidos"
  cantidad: number; // contador disponible
  ciudad: string;
  ubicacionTexto: string; // dónde retirarlo
  contacto: string;
  creadoEn: number;
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
