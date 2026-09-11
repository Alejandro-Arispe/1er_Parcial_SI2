/**
 * Formas de lectura para dashboards. No son entidades del dominio:
 * son proyecciones calculadas sobre Venta, Inventario, Reserva y Producto.
 */

export interface ResumenIndicadores {
  monto_total: number;
  cantidad_ventas: number;
  ticket_promedio: number;
  unidades_vendidas: number;
  reservas_activas: number;
  productos_activos: number;
  inventario_critico: number;
  variacion_pct: number;
}

export interface PuntoPeriodo {
  periodo: string;
  total: number;
  cantidad: number;
}

export interface TotalPorSucursal {
  id_sucursal: number;
  sucursal: string;
  total: number;
  cantidad: number;
}

export interface TopProducto {
  id_producto: number;
  nombre: string;
  unidades: number;
  total: number;
}

export interface ConteoPorEstado {
  estado: string;
  cantidad: number;
}

export interface FiltroReporte {
  desde?: string;
  hasta?: string;
  id_sucursal?: number;
}
