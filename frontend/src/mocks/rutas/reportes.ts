import { redondear, stockDisponible } from '../../lib/domain';
import { EstadoReserva, EstadoVenta, type Venta } from '../../types/domain';
import type {
  ConteoPorEstado,
  PuntoPeriodo,
  ResumenIndicadores,
  TopProducto,
  TotalPorSucursal,
} from '../../types/reportes';
import { inventario, productos, reservas, sucursales, ventas } from '../db';
import { expandirInventario, num, type RutaMock } from '../core';

const UMBRAL_CRITICO = 3;

function ventasFiltradas(params: Record<string, unknown>): Venta[] {
  const idSucursal = num(params.id_sucursal);
  const desde = params.desde ? String(params.desde) : undefined;
  const hasta = params.hasta ? `${String(params.hasta)}T23:59:59` : undefined;

  return ventas.filter(
    (v) =>
      v.estado !== EstadoVenta.ANULADA &&
      (!idSucursal || v.id_sucursal === idSucursal) &&
      (!desde || v.fecha >= desde) &&
      (!hasta || v.fecha <= hasta),
  );
}

function unidades(v: Venta): number {
  return v.detalles.reduce((acc, d) => acc + d.cantidad, 0);
}

export const rutasReportes: RutaMock[] = [
  {
    metodo: 'GET',
    patron: /^\/reportes\/resumen$/,
    handler: ({ params }): ResumenIndicadores => {
      const lista = ventasFiltradas(params);
      const monto = redondear(lista.reduce((acc, v) => acc + v.total, 0));

      // Comparativo simple: ultimos 30 dias contra los 30 previos.
      const ahora = Date.now();
      const mes = 30 * 86400000;
      const actual = ventas.filter((v) => new Date(v.fecha).getTime() >= ahora - mes);
      const previo = ventas.filter((v) => {
        const t = new Date(v.fecha).getTime();
        return t < ahora - mes && t >= ahora - 2 * mes;
      });
      const totalActual = actual.reduce((a, v) => a + v.total, 0);
      const totalPrevio = previo.reduce((a, v) => a + v.total, 0);

      return {
        monto_total: monto,
        cantidad_ventas: lista.length,
        ticket_promedio: lista.length ? redondear(monto / lista.length) : 0,
        unidades_vendidas: lista.reduce((acc, v) => acc + unidades(v), 0),
        reservas_activas: reservas.filter((r) =>
          [EstadoReserva.PENDIENTE, EstadoReserva.PREPARANDO, EstadoReserva.LISTA, EstadoReserva.CLIENTE_PRESENTE].includes(
            r.estado as never,
          ),
        ).length,
        productos_activos: productos.filter((p) => p.activo).length,
        inventario_critico: inventario.filter((i) => stockDisponible(i) <= UMBRAL_CRITICO).length,
        variacion_pct: totalPrevio ? redondear(((totalActual - totalPrevio) / totalPrevio) * 100) : 0,
      };
    },
  },
  {
    metodo: 'GET',
    patron: /^\/reportes\/ventas-por-periodo$/,
    handler: ({ params }): PuntoPeriodo[] => {
      const lista = ventasFiltradas(params);
      const acumulado = new Map<string, PuntoPeriodo>();

      // Serie de los ultimos 30 dias para que el grafico no tenga huecos.
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const clave = d.toISOString().slice(0, 10);
        acumulado.set(clave, { periodo: clave, total: 0, cantidad: 0 });
      }
      for (const v of lista) {
        const clave = v.fecha.slice(0, 10);
        const punto = acumulado.get(clave);
        if (!punto) continue;
        punto.total = redondear(punto.total + v.total);
        punto.cantidad += 1;
      }
      return [...acumulado.values()];
    },
  },
  {
    metodo: 'GET',
    patron: /^\/reportes\/ventas-por-sucursal$/,
    handler: ({ params }): TotalPorSucursal[] => {
      const lista = ventasFiltradas(params);
      return sucursales.map((s) => {
        const propias = lista.filter((v) => v.id_sucursal === s.id_sucursal);
        return {
          id_sucursal: s.id_sucursal,
          sucursal: s.nombre,
          total: redondear(propias.reduce((acc, v) => acc + v.total, 0)),
          cantidad: propias.length,
        };
      });
    },
  },
  {
    metodo: 'GET',
    patron: /^\/reportes\/top-productos$/,
    handler: ({ params }): TopProducto[] => {
      const limite = num(params.limite) ?? 5;
      const acumulado = new Map<number, TopProducto>();
      for (const v of ventasFiltradas(params)) {
        for (const d of v.detalles) {
          const actual = acumulado.get(d.id_producto) ?? {
            id_producto: d.id_producto,
            nombre: productos.find((p) => p.id_producto === d.id_producto)?.nombre ?? 'Producto',
            unidades: 0,
            total: 0,
          };
          actual.unidades += d.cantidad;
          actual.total = redondear(actual.total + d.cantidad * d.precio_unitario - d.descuento);
          acumulado.set(d.id_producto, actual);
        }
      }
      return [...acumulado.values()].sort((a, b) => b.unidades - a.unidades).slice(0, limite);
    },
  },
  {
    metodo: 'GET',
    patron: /^\/reportes\/inventario-critico$/,
    handler: ({ params }) => {
      const idSucursal = num(params.id_sucursal);
      const umbral = num(params.umbral) ?? UMBRAL_CRITICO;
      return inventario
        .filter((i) => (!idSucursal || i.id_sucursal === idSucursal) && stockDisponible(i) <= umbral)
        .sort((a, b) => stockDisponible(a) - stockDisponible(b))
        .slice(0, num(params.limite) ?? 10)
        .map(expandirInventario);
    },
  },
  {
    metodo: 'GET',
    patron: /^\/reportes\/reservas-por-estado$/,
    handler: ({ params }): ConteoPorEstado[] => {
      const idSucursal = num(params.id_sucursal);
      const lista = idSucursal ? reservas.filter((r) => r.id_sucursal === idSucursal) : reservas;
      return Object.values(EstadoReserva).map((estado) => ({
        estado,
        cantidad: lista.filter((r) => r.estado === estado).length,
      }));
    },
  },
];
