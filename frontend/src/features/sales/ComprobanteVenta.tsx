import { BadgeCanal, BadgePago, BadgeVenta } from '../../components/ui/Badges';
import { subtotal, totalLineas } from '../../lib/domain';
import { etiqueta, fechaHora, moneda } from '../../lib/format';
import type { Venta } from '../../types/domain';

/** Comprobante reutilizado por cliente, caja y administracion. */
export function ComprobanteVenta({ venta }: { venta: Venta }) {
  const bruto = totalLineas(venta.detalles.map((d) => ({ cantidad: d.cantidad, precio_unitario: d.precio_unitario })));
  const descuentos = venta.detalles.reduce((acc, d) => acc + d.descuento, 0);

  return (
    <div className="fs-pila">
      <div className="fs-fila-entre">
        <div>
          <p className="fs-eyebrow">Comprobante</p>
          <h2>Venta #{venta.id_venta}</h2>
          <p className="fs-sub">{fechaHora(venta.fecha)}</p>
        </div>
        <div className="fs-fila" style={{ gap: 8 }}>
          <BadgeCanal canal={venta.canal} />
          <BadgeVenta estado={venta.estado} />
        </div>
      </div>

      <div className="fs-rejilla-form">
        <div>
          <p className="fs-eyebrow">Cliente</p>
          <p>{venta.cliente?.nombre ?? 'Consumidor final'}</p>
        </div>
        <div>
          <p className="fs-eyebrow">Sucursal</p>
          <p>{venta.sucursal?.nombre ?? '-'}</p>
        </div>
      </div>

      <div className="fs-tabla-scroll">
        <table className="fs-tabla">
          <thead>
            <tr>
              <th>Prenda</th>
              <th>Talla</th>
              <th>Color</th>
              <th className="fs-tabla-num">Cant.</th>
              <th className="fs-tabla-num">P. unitario</th>
              <th className="fs-tabla-num">Descuento</th>
              <th className="fs-tabla-num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.detalles.map((d) => (
              <tr key={d.id_detalle_venta}>
                <td>{d.producto?.nombre ?? `Producto ${d.id_producto}`}</td>
                <td>{d.talla?.nombre}</td>
                <td>{d.color?.nombre}</td>
                <td className="fs-tabla-num">{d.cantidad}</td>
                <td className="fs-tabla-num">{moneda(d.precio_unitario)}</td>
                <td className="fs-tabla-num">{d.descuento > 0 ? `- ${moneda(d.descuento)}` : '-'}</td>
                <td className="fs-tabla-num">{moneda(subtotal(d.cantidad, d.precio_unitario, d.descuento))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginLeft: 'auto', minWidth: 240 }} className="fs-pila">
        <div className="fs-resumen__linea">
          <span>Subtotal</span>
          <span className="fs-nums">{moneda(bruto)}</span>
        </div>
        {descuentos > 0 && (
          <div className="fs-resumen__linea">
            <span>Descuentos</span>
            <span className="fs-nums">- {moneda(descuentos)}</span>
          </div>
        )}
        <div className="fs-resumen__total">
          <span>Total</span>
          <span className="fs-nums">{moneda(venta.total)}</span>
        </div>
      </div>

      <div className="fs-pila" style={{ gap: 8 }}>
        <p className="fs-eyebrow">Pagos</p>
        {venta.pagos.map((p) => (
          <div key={p.id_pago} className="fs-fila-entre">
            <span>
              {etiqueta(p.metodo)} <span className="fs-sub">({etiqueta(p.tipo)})</span>
            </span>
            <div className="fs-fila" style={{ gap: 10 }}>
              <span className="fs-nums">{moneda(p.monto)}</span>
              <BadgePago estado={p.estado} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
