import type { Producto } from './domain';

export interface MensajeChat {
  id: string;
  rol: 'usuario' | 'asistente';
  texto: string;
  productos?: Producto[];
  fecha: string;
}

/** Respuesta esperada del endpoint que NestJS expondra sobre Gemini. */
export interface RespuestaAsistente {
  respuesta: string;
  productos_sugeridos: Producto[];
}
