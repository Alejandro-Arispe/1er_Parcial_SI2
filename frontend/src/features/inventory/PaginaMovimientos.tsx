import { useState } from 'react';
import { ErrorEstado, FilasSkeleton, Vacio } from '../../components/ui/Estados';
import { Paginacion } from '../../components/ui/Paginacion';
import { useAuth } from '../../context/AuthContext';
import { useMovimientos, useSucursales } from '../../hooks/useOperaciones';
import { etiqueta, fechaHora } from '../../lib/format';
import { TipoMovimiento } from '../../types/domain';

export default function PaginaMovimientos() {
  const { idSucursal, tieneRol } = useAuth();
  const esAdmin = tieneRol('ADMINISTRADOR');

  const [tipo, setTipo] = useState('');
  const [sucursalFiltro, setSucursalFiltro] = useState<number | ''>(esAdmin ? '' : (idSucursal ?? ''));
  const [page, setPage] = useState(1);

  const sucursales = useSucursales();
  const consulta = useMovimientos({
    tipo: tipo || undefined,
    id_sucursal: sucursalFiltro || undefined,
    page,
  });

  return (
    <>
      <header className="fs-pagina-cabecera">
        <div>
          <p className="fs-eyebrow">Operaciones</p>
          <h1>Movimientos de inventario</h1>
          <p className="fs-sub">Entradas, salidas, reservas, devoluciones y ajustes registrados.</p>
        </div>
      </header>

      <section className="fs-tarjeta fs-tarjeta--pad fs-pila">
        <div className="fs-fila-wrap">
          <div className="fs-campo" style={{ minWidth: 220 }}>
            <label htmlFor="tipo-filtro">Tipo</label>
            <select id="tipo-filtro" className="fs-select" value={tipo} onChange={(e) => { setTipo(e.target.value); setPage(1); }}>
              <option value="">Todos</option>
              {Object.values(TipoMovimiento).map((t) => (
                <option key={t} value={t}>
                  {etiqueta(t)}
                </option>
              ))}
            </select>
          </div>

          {esAdmin && (
            <div className="fs-campo" style={{ minWidth: 220 }}>
              <label htmlFor="sucursal-movimientos">Sucursal</label>
              <select
                id="sucursal-movimientos"
                className="fs-select"
                value={sucursalFiltro}
                onChange={(e) => {
                  setSucursalFiltro(e.target.value ? Number(e.target.value) : '');
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                {sucursales.data?.map((s) => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {consulta.isPending && <FilasSkeleton filas={6} />}
        {consulta.isError && <ErrorEstado error={consulta.error} onReintentar={() => consulta.refetch()} />}
        {consulta.data && consulta.data.items.length === 0 && (
          <Vacio titulo="Sin movimientos" mensaje="No hay movimientos registrados con esos filtros." />
        )}

        {consulta.data && consulta.data.items.length > 0 && (
          <>
            <div className="fs-tabla-scroll">
              <table className="fs-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Prenda</th>
                    <th>Sucursal</th>
                    <th className="fs-tabla-num">Cantidad</th>
                    <th>Referencia</th>
                    <th>Estado</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {consulta.data.items.map((m) => (
                    <tr key={m.id_movimiento}>
                      <td>{fechaHora(m.fecha)}</td>
                      <td>
                        <span className="fs-badge">{etiqueta(m.tipo)}</span>
                      </td>
                      <td>
                        {m.inventario?.producto?.nombre}
                        <div className="fs-sub">
                          {m.inventario?.talla?.nombre} - {m.inventario?.color?.nombre}
                        </div>
                      </td>
                      <td>{m.inventario?.sucursal?.nombre}</td>
                      <td className="fs-tabla-num">{m.cantidad}</td>
                      <td className="fs-sub">{m.referencia || '-'}</td>
                      <td>
                        <span className={`fs-badge${m.estado === 'PENDIENTE' ? ' fs-badge--alerta' : ' fs-badge--exito'}`}>
                          {etiqueta(m.estado)}
                        </span>
                      </td>
                      <td className="fs-sub">{m.empleado?.nombre ?? 'Sistema'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion
              page={consulta.data.page}
              pageSize={consulta.data.page_size}
              total={consulta.data.total}
              onCambiar={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}
