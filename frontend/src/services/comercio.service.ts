/** Tipos de seleccion compartidos. Carrito y reservas usan servicios reales separados; ventas y pagos siguen pendientes de migrar. */
import { api } from '../api/http';
import { endpoints } from '../api/endpoints';
import type { Paginado, ParamsPaginacion } from '../types/api';
import type { CanalVenta, EstadoReserva, MetodoPago, Pago, TipoPago, Venta } from '../types/domain';

export interface LineaSeleccion {
  id_producto: number;
  id_talla: number;
  id_color: number;
  cantidad: number;
}

export interface DatosReserva {
  id_sucursal: number;
  horario_aproximado: string;
  observacion?: string;
  detalles: LineaSeleccion[];
}

export interface DatosVenta {
  canal: CanalVenta;
  id_sucursal: number | null;
  id_cliente?: number | null;
  id_reserva?: number | null;
  detalles: LineaSeleccion[];
  pago: { metodo: MetodoPago; tipo?: TipoPago; referencia_externa?: string };
}

export interface FiltrosReserva extends ParamsPaginacion {
  id_sucursal?: number;
  estado?: EstadoReserva;
}

export interface FiltrosVenta extends ParamsPaginacion {
  id_sucursal?: number;
  canal?: CanalVenta;
  desde?: string;
  hasta?: string;
}

export { carritoService } from './carrito.service';

export { reservasService } from './reservas.service';

export const ventasService = {
  listar(filtros: FiltrosVenta = {}) {
    return api.get<Paginado<Venta>>(endpoints.ventas.lista, filtros);
  },
  obtener(id: number) {
    return api.get<Venta>(endpoints.ventas.detalle(id));
  },
  registrar(datos: DatosVenta) {
    return api.post<Venta>(endpoints.ventas.crear, datos);
  },
  registrarPago(idVenta: number, datos: Omit<Pago, 'id_pago' | 'id_venta' | 'estado' | 'fecha'>) {
    return api.post<Pago>(endpoints.ventas.pagos(idVenta), datos);
  },
};
