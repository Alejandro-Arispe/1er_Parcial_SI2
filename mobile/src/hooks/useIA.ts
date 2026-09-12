/** Recomendaciones y asistente. El proveedor real (Gemini) vive en NestJS. */
import { useMutation, useQuery } from '@tanstack/react-query';
import { iaService } from '../services/ia.service';
import { useSesion } from '../context/SesionContext';
import { claves } from './claves';

export function useRecomendaciones(opciones: { limite?: number; contexto?: string } = {}) {
  const { autenticado } = useSesion();
  return useQuery({
    queryKey: claves.recomendaciones(opciones.contexto),
    queryFn: () => iaService.recomendaciones(opciones),
    enabled: autenticado,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePreguntarIA() {
  return useMutation({
    mutationFn: ({ mensaje, historial }: { mensaje: string; historial: string[] }) =>
      iaService.preguntar(mensaje, historial),
  });
}
