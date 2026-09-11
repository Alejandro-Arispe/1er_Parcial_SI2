import { useMemo, useState } from 'react';
import { ErrorEstado, FilasSkeleton, Vacio } from '../../components/ui/Estados';
import {
  useReservasPorEstado,
  useResumen,
  useSucursales,
  useTopProductos,
  useVentasPorPeriodo,
  useVentasPorSucursal,
} from '../../hooks/useOperaciones';
import { etiqueta, moneda } from '../../lib/format';
import type { FiltroReporte } from '../../types/reportes';
import { BarraComparativa, GraficoSucursales, GraficoVentas, TarjetaKPI } from './componentes';

function haceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

export default function PaginaReportes() {
  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));
  const [idSucursal, setIdSucursal] = useState<number | ''>('');

  const filtros = useMemo<FiltroReporte>(
    () => ({ desde, hasta, id_sucursal: idSucursal || undefined }),
    [desde, hasta, idSucursal],
  );

  const sucursales = useSucursales();
  const resumen = useResumen(filtros);
  const periodo = useVentasPorPeriodo(filtros);
  const porSucursal = useVentasPorSucursal(filtros);
  const top = useTopProductos({ ...filtros, limite: 8 });
  const reservas = useReservasPorEstado(filtros);

  const maxTop = Math.max(1, ...(top.data?.map((t) => t.unidades) ?? [1]));
  const totalReservas = reservas.data?.reduce((acc, r) => acc + r.cantidad, 0) ?? 0;

  return (
    <>
      <header className="fs-pagina-cabecera">
        <div>
          <p className="fs-eyebrow">Administracion</p>
          <h1>Reportes</h1>
          <p className="fs-sub">Indicadores construidos sobre ventas, reservas e inventario.</p>
        </div>
      </header>

      <section className="fs-tarjeta fs-tarjeta--pad">
        <div className="fs-fila-wrap">
          <div className="fs-campo">
            <label htmlFor="desde">Desde</label>
            <input id="desde" type="date" className="fs-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="fs-campo">
            <label htmlFor="hasta">Hasta</label>
            <input id="hasta" type="date" className="fs-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="fs-campo" style={{ minWidth: 220 }}>
            <label htmlFor="sucursal-reporte">Sucursal</label>
            <select
              id="sucursal-reporte"
              className="fs-select"
              value={idSucursal}
              onChange={(e) => setIdSucursal(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Todas</option>
              {sucursales.data?.map((s) => (
                <option key={s.id_sucursal} value={s.id_sucursal}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="fs-fila" style={{ alignSelf: 'flex-end' }}>
            <button
              type="button"
              className="fs-btn fs-btn--contorno fs-btn--s"
              onClick={() => {
                setDesde(haceDias(30));
                setHasta(new Date().toISOString().slice(0, 10));
                setIdSucursal('');
              }}
            >
              Reiniciar filtros
            </button>
          </div>
        </div>
      </section>

      {resumen.isPending && <FilasSkeleton filas={2} />}
      {resumen.isError && <ErrorEstado error={resumen.error} onReintentar={() => resumen.refetch()} />}
      {resumen.data && (
        <section className="fs-kpis">
          <TarjetaKPI etiqueta="Monto vendido" valor={moneda(resumen.data.monto_total)} />
          <TarjetaKPI etiqueta="Ventas" valor={String(resumen.data.cantidad_ventas)} />
          <TarjetaKPI etiqueta="Ticket promedio" valor={moneda(resumen.data.ticket_promedio)} />
          <TarjetaKPI etiqueta="Unidades" valor={String(resumen.data.unidades_vendidas)} />
          <TarjetaKPI etiqueta="Reservas en el periodo" valor={String(totalReservas)} />
        </section>
      )}

      <section className="fs-panel">
        <h3>Evolucion de ventas</h3>
        {periodo.isPending && <FilasSkeleton filas={3} />}
        {periodo.data && periodo.data.every((p) => p.total === 0) && (
          <Vacio titulo="Sin ventas en el periodo" mensaje="Ajusta el rango de fechas o la sucursal seleccionada." />
        )}
        {periodo.data && periodo.data.some((p) => p.total > 0) && <GraficoVentas datos={periodo.data} />}
      </section>

      <section className="fs-rejilla-2">
        <article className="fs-panel">
          <h3>Comparativo por sucursal</h3>
          {porSucursal.isPending && <FilasSkeleton filas={3} />}
          {porSucursal.data && <GraficoSucursales datos={porSucursal.data} />}
          {porSucursal.data && (
            <div className="fs-tabla-scroll">
              <table className="fs-tabla">
                <thead>
                  <tr>
                    <th>Sucursal</th>
                    <th className="fs-tabla-num">Ventas</th>
                    <th className="fs-tabla-num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porSucursal.data.map((s) => (
                    <tr key={s.id_sucursal}>
                      <td>{s.sucursal}</td>
                      <td className="fs-tabla-num">{s.cantidad}</td>
                      <td className="fs-tabla-num">{moneda(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="fs-panel">
          <h3>Ranking de prendas</h3>
          {top.isPending && <FilasSkeleton filas={5} />}
          {top.data && top.data.length === 0 && (
            <Vacio titulo="Sin datos" mensaje="No hubo ventas de prendas en el periodo elegido." />
          )}
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

      <section className="fs-panel">
        <h3>Estado de las reservas</h3>
        {reservas.isPending && <FilasSkeleton filas={3} />}
        {reservas.data && (
          <div className="fs-rejilla-3">
            {reservas.data.map((r) => (
              <div key={r.estado} className="fs-kpi">
                <p className="fs-eyebrow">{etiqueta(r.estado)}</p>
                <p className="fs-kpi__valor">{r.cantidad}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
