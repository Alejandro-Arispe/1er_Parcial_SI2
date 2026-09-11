/**
 * IA. La llamada a Gemini vive en NestJS: el frontend nunca maneja la API key.
 * Endpoints esperados:
 *   POST /ia/asistente        -> { respuesta, productos_sugeridos }
 *   GET  /ia/recomendaciones  -> RecomendacionIA[]
 */
import { api } from '../api/http';
import { endpoints } from '../api/endpoints';
import type { RecomendacionIA } from '../types/domain';
import type { RespuestaAsistente } from '../types/ia';

export const iaService = {
  preguntar(mensaje: string, historial: string[] = []) {
    return api.post<RespuestaAsistente>(endpoints.ia.asistente, { mensaje, historial });
  },
  recomendaciones(opciones: { limite?: number; contexto?: string } = {}) {
    return api.get<RecomendacionIA[]>(endpoints.ia.recomendaciones, opciones);
  },
};
