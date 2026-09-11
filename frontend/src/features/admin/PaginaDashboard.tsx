import { Link } from 'react-router-dom';
import { BadgeStock } from '../../components/ui/Badges';
import { ErrorEstado, FilasSkeleton, Vacio } from '../../components/ui/Estados';
import {
  useInventarioCritico,
  useReservasPorEstado,
  useResumen,
  useTopProductos,
  useVentasPorPeriodo,
  useVentasPorSucursal,
} from '../../hooks/useOperaciones';
import { stockDisponible } from '../../lib/domain';
import { etiqueta, moneda } from '../../lib/format';
import { BarraComparativa, GraficoSucursales, GraficoVentas, TarjetaKPI } from '../reports/componentes';

export default function PaginaDashboard() {
  const resumen = useResumen();
  const periodo = useVentasPorPeriodo();
  const sucursales = useVentasPorSucursal();
  const top = useTopProductos({ limite: 5 });
  const critico = useInventarioCritico({ limite: 6 });
  const reservas = useReservasPorEstado();

  const maxTop = Math.max(1, ...(top.data?.map((t) => t.unidades) ?? [1]));

  return (
    <>
      <header className="fs-pagina-cabecera">
        <div>
          <p className="fs-eyebrow">Administracion</p>
          <h1>Dashboard</h1>
          <p className="fs-sub">Vision general de ventas, reservas e inventario.</p>
        </div>
        <Link to="/admin/reportes" className="fs-btn fs-btn--contorno fs-btn--s">
          Ver reportes
        </Link>
      </header>

      {resumen.isPending && <FilasSkeleton filas={2} />}
      {resumen.isError && <ErrorEstado error={resumen.error} onReintentar={() => resumen.refetch()} />}
      {resumen.data && (
        <section className="fs-kpis">
          <TarjetaKPI
            etiqueta="Ventas acumuladas"
            valor={moneda(resumen.data.monto_total)}
            delta={resumen.data.variacion_pct}
          />
          <TarjetaKPI
            etiqueta="Transacciones"
            valor={String(resumen.data.cantidad_ventas)}
            detalle={`Ticket promedio ${moneda(resumen.data.ticket_promedio)}`}
          />
          <TarjetaKPI
            etiqueta="Unidades vendidas"
            valor={String(resumen.data.unidades_vendidas)}
            detalle={`${resumen.data.productos_activos} productos activos`}
          />
          <TarjetaKPI
            etiqueta="Reservas activas"
            valor={String(resumen.data.reservas_activas)}
            detalle="Pendientes, preparando, listas o en tienda"
          />
          <TarjetaKPI
            etiqueta="Inventario critico"
            valor={String(resumen.data.inventario_critico)}
            detalle="Combinaciones con 3 o menos unidades"
          />
        </section>
      )}

      <section className="fs-rejilla-2">
        <article className="fs-panel">
          <div className="fs-fila-entre">
            <h3>Ventas de los ultimos 30 dias</h3>
          </div>
          {periodo.isPending && <FilasSkeleton filas={3} />}
          {periodo.isError && <ErrorEstado error={periodo.error} onReintentar={() => periodo.refetch()} />}
          {periodo.data && <GraficoVentas datos={periodo.data} />}
        </article>

        <article className="fs-panel">
          <h3>Productos mas vendidos</h3>
          {top.isPending && <FilasSkeleton filas={4} />}
          {top.data && top.data.length === 0 && <Vacio titulo="Sin ventas" mensaje="Todavia no hay ventas registradas." />}
          {top.data && top.data.length > 0 && (
            <div className="fs-pila">
              {top.data.map((t) => (
                <BarraComparativa
                  key={t.id_producto}
                  etiqueta={t.nombre}
                  valor={t.unidades}
                  maximo={maxTop}
                  detalle={`${t.unidades} u - ${moneda(t.total)}`}
                />
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="fs-rejilla-2">
        <article className="fs-panel">
          <h3>Ventas por sucursal</h3>
          {sucursales.isPending && <FilasSkeleton filas={3} />}
          {sucursales.data && <GraficoSucursales datos={sucursales.data} />}
        </article>

        <article className="fs-panel">
          <h3>Reservas por estado</h3>
          {reservas.isPending && <FilasSkeleton filas={4} />}
          {reservas.data && (
            <div className="fs-pila" style={{ gap: 8 }}>
              {reservas.data.map((r) => (
                <div key={r.estado} className="fs-fila-entre">
                  <span>{etiqueta(r.estado)}</span>
                  <span className="fs-nums">{r.cantidad}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="fs-panel">
        <div className="fs-fila-entre">
          <h3>Inventario que requiere atencion</h3>
          <Link to="/admin/inventario" className="fs-btn fs-btn--contorno fs-btn--s">
            Ver inventario
          </Link>
        </div>
        {critico.isPending && <FilasSkeleton filas={4} />}
        {critico.data && critico.data.length === 0 && (
          <Vacio titulo="Stock saludable" mensaje="Ninguna combinacion esta por debajo del umbral critico." />
        )}
        {critico.data && critico.data.length > 0 && (
          <div className="fs-tabla-scroll">
            <table className="fs-tabla">
              <thead>
                <tr>
                  <th>Prenda</th>
                  <th>Talla</th>
                  <th>Color</th>
                  <th>Sucursal</th>
                  <th className="fs-tabla-num">Fisico</th>
                  <th className="fs-tabla-num">Reservado</th>
                  <th>Disponible</th>
                </tr>
              </thead>
              <tbody>
                {critico.data.map((i) => (
                  <tr key={i.id_inventario}>
                    <td>{i.producto?.nombre}</td>
                    <td>{i.talla?.nombre}</td>
                    <td>{i.color?.nombre}</td>
                    <td>{i.sucursal?.nombre}</td>
                    <td className="fs-tabla-num">{i.cantidad_fisica}</td>
                    <td className="fs-tabla-num">{i.cantidad_reservada}</td>
                    <td>
                      <BadgeStock disponible={stockDisponible(i)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
