/**
 * Inventario y movimientos.
 * Endpoints esperados:
 *   GET  /inventario?id_sucursal&id_producto&solo_criticos -> Paginado<Inventario>
 *   GET  /inventario/disponibilidad?id_producto&id_talla&id_color -> Inventario[]
 *   GET  /inventario/movimientos -> Paginado<MovimientoInventario>
 *   POST /inventario/movimientos -> MovimientoInventario
 *   POST /inventario -> Inventario
 */
import { api } from '../api/http';
import { endpoints } from '../api/endpoints';
import type { Paginado, ParamsPaginacion } from '../types/api';
import type { Inventario, MovimientoInventario, TipoMovimiento } from '../types/domain';

export interface FiltrosInventario extends ParamsPaginacion {
  q?: string;
  id_sucursal?: number;
  id_producto?: number;
  solo_criticos?: boolean;
  umbral?: number;
}

export interface ConsultaDisponibilidad {
  id_producto: number;
  id_talla?: number;
  id_color?: number;
  id_sucursal?: number;
}

export interface DatosMovimiento {
  id_inventario: number;
  tipo: TipoMovimiento;
  cantidad: number;
  referencia?: string;
  observacion?: string;
  fecha_programada?: string | null;
}

export const inventarioService = {
  listar(filtros: FiltrosInventario = {}) {
    return api.get<Paginado<Inventario>>(endpoints.inventario.lista, filtros);
  },
  disponibilidad(consulta: ConsultaDisponibilidad) {
    return api.get<Inventario[]>(endpoints.inventario.disponibilidad, consulta);
  },
  movimientos(filtros: ParamsPaginacion & { id_sucursal?: number; tipo?: string } = {}) {
    return api.get<Paginado<MovimientoInventario>>(endpoints.inventario.movimientos, filtros);
  },
  registrarMovimiento(datos: DatosMovimiento) {
    return api.post<MovimientoInventario>(endpoints.inventario.crearMovimiento, datos);
  },
  crearRegistro(datos: Omit<Inventario, 'id_inventario' | 'cantidad_reservada'>) {
    return api.post<Inventario>(endpoints.inventario.lista, datos);
  },
};
