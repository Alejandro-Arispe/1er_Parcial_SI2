/**
 * Indicadores y reportes. Son proyecciones sobre ventas, inventario y reservas;
 * el backend es quien las calcula.
 * Endpoints esperados:
 *   GET /reportes/resumen
 *   GET /reportes/ventas-por-periodo
 *   GET /reportes/ventas-por-sucursal
 *   GET /reportes/top-productos
 *   GET /reportes/inventario-critico
 *   GET /reportes/reservas-por-estado
 */
import { api } from '../api/http';
import { endpoints } from '../api/endpoints';
import type { Inventario } from '../types/domain';
import type {
  ConteoPorEstado,
  FiltroReporte,
  PuntoPeriodo,
  ResumenIndicadores,
  TopProducto,
  TotalPorSucursal,
} from '../types/reportes';

export const reportesService = {
  resumen(filtros: FiltroReporte = {}) {
    return api.get<ResumenIndicadores>(endpoints.reportes.resumen, filtros);
  },
  ventasPorPeriodo(filtros: FiltroReporte = {}) {
    return api.get<PuntoPeriodo[]>(endpoints.reportes.ventasPorPeriodo, filtros);
  },
  ventasPorSucursal(filtros: FiltroReporte = {}) {
    return api.get<TotalPorSucursal[]>(endpoints.reportes.ventasPorSucursal, filtros);
  },
  topProductos(filtros: FiltroReporte & { limite?: number } = {}) {
    return api.get<TopProducto[]>(endpoints.reportes.topProductos, filtros);
  },
  inventarioCritico(filtros: FiltroReporte & { umbral?: number; limite?: number } = {}) {
    return api.get<Inventario[]>(endpoints.reportes.inventarioCritico, filtros);
  },
  reservasPorEstado(filtros: FiltroReporte = {}) {
    return api.get<ConteoPorEstado[]>(endpoints.reportes.reservasPorEstado, filtros);
  },
};
