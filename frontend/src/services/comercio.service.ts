/**
 * Carrito, reservas, ventas y pagos.
 * Endpoints esperados:
 *   GET    /carrito                     -> Carrito
 *   POST   /carrito/items               -> Carrito
 *   PATCH  /carrito/items/:id           -> Carrito
 *   DELETE /carrito/items/:id           -> Carrito
 *   DELETE /carrito                     -> Carrito vacio
 *   GET    /reservas?id_sucursal&estado -> Paginado<Reserva>
 *   POST   /reservas                    -> Reserva
 *   PATCH  /reservas/:id/estado         -> Reserva
 *   POST   /reservas/:id/cancelar       -> Reserva
 *   GET    /ventas?...                  -> Paginado<Venta>
 *   POST   /ventas                      -> Venta
 *   POST   /ventas/:id/pagos            -> Pago
 */
import { api } from '../api/http';
import { endpoints } from '../api/endpoints';
import type { Paginado, ParamsPaginacion } from '../types/api';
import type {
  CanalVenta,
  Carrito,
  EstadoReserva,
  MetodoPago,
  Pago,
  Reserva,
  TipoPago,
  Venta,
} from '../types/domain';

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

export const carritoService = {
  obtener() {
    return api.get<Carrito>(endpoints.carrito.actual);
  },
  agregar(linea: LineaSeleccion) {
    return api.post<Carrito>(endpoints.carrito.items, linea);
  },
  cambiarCantidad(idDetalle: number, cantidad: number) {
    return api.patch<Carrito>(endpoints.carrito.item(idDetalle), { cantidad });
  },
  quitar(idDetalle: number) {
    return api.delete<Carrito>(endpoints.carrito.item(idDetalle));
  },
  vaciar() {
    return api.delete<Carrito>(endpoints.carrito.vaciar);
  },
};

export const reservasService = {
  listar(filtros: FiltrosReserva = {}) {
    return api.get<Paginado<Reserva>>(endpoints.reservas.lista, filtros);
  },
  obtener(id: number) {
    return api.get<Reserva>(endpoints.reservas.detalle(id));
  },
  crear(datos: DatosReserva) {
    return api.post<Reserva>(endpoints.reservas.crear, datos);
  },
  cambiarEstado(id: number, estado: EstadoReserva) {
    return api.patch<Reserva>(endpoints.reservas.estado(id), { estado });
  },
  cancelar(id: number) {
    return api.post<Reserva>(endpoints.reservas.cancelar(id));
  },
};

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
