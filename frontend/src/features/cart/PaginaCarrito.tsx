import { Link, useNavigate } from 'react-router-dom';
import { Cargando, ErrorEstado, Vacio } from '../../components/ui/Estados';
import { ImagenProducto } from '../../components/ui/ImagenProducto';
import { useToast } from '../../context/ToastContext';
import {
  useCambiarCantidadCarrito,
  useCarrito,
  useQuitarDelCarrito,
  useVaciarCarrito,
} from '../../hooks/useComercio';
import { moneda } from '../../lib/format';
import { subtotal } from '../../lib/domain';

export default function PaginaCarrito() {
  const carrito = useCarrito();
  const cambiarCantidad = useCambiarCantidadCarrito();
  const quitar = useQuitarDelCarrito();
  const vaciar = useVaciarCarrito();
  const toast = useToast();
  const navegar = useNavigate();

  if (carrito.isPending) return <Cargando texto="Cargando tu carrito..." />;
  if (carrito.isError) return <ErrorEstado error={carrito.error} onReintentar={() => carrito.refetch()} />;

  if (carrito.detalles.length === 0) {
    return (
      <div className="fs-contenedor" style={{ padding: '48px 0' }}>
        <Vacio
          titulo="Tu carrito esta vacio"
          mensaje="Explora el catalogo y agrega las prendas que quieras comprar."
          accion={
            <Link to="/catalogo" className="fs-btn fs-btn--acento">
              Ir al catalogo
            </Link>
          }
        />
      </div>
    );
  }

  async function accion(promesa: Promise<unknown>, mensajeExito: string) {
    try {
      await promesa;
      toast.exito(mensajeExito);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos actualizar el carrito.');
    }
  }

  return (
    <div className="fs-contenedor fs-compra">
      <section>
        <div className="fs-fila-entre" style={{ marginBottom: 16 }}>
          <div>
            <p className="fs-eyebrow">Compra</p>
            <h1>Tu carrito</h1>
          </div>
          <button
            type="button"
            className="fs-btn fs-btn--fantasma fs-btn--s"
            onClick={() => accion(vaciar.mutateAsync(), 'Carrito vaciado.')}
            disabled={vaciar.isPending}
          >
            Vaciar carrito
          </button>
        </div>

        {carrito.detalles.map((d) => (
          <article key={d.id_detalle_carrito} className="fs-linea-item">
            <Link to={`/producto/${d.id_producto}`} className="fs-linea-item__img">
              <ImagenProducto src={d.producto?.imagen_url ?? ''} alt={d.producto?.nombre ?? ''} />
            </Link>

            <div className="fs-pila" style={{ gap: 6 }}>
              <Link to={`/producto/${d.id_producto}`} style={{ fontWeight: 600 }}>
                {d.producto?.nombre}
              </Link>
              <span className="fs-sub">
                Talla {d.talla?.nombre} - {d.color?.nombre}
              </span>
              <span className="fs-sub">{moneda(d.precio_unitario)} c/u</span>

              <div className="fs-fila" style={{ gap: 12 }}>
                <div className="fs-cantidad">
                  <button
                    type="button"
                    onClick={() =>
                      accion(
                        cambiarCantidad.mutateAsync({ id: d.id_detalle_carrito, cantidad: d.cantidad - 1 }),
                        'Cantidad actualizada.',
                      )
                    }
                    disabled={d.cantidad <= 1 || cambiarCantidad.isPending}
                  >
                    -
                  </button>
                  <span>{d.cantidad}</span>
                  <button
                    type="button"
                    onClick={() =>
                      accion(
                        cambiarCantidad.mutateAsync({ id: d.id_detalle_carrito, cantidad: d.cantidad + 1 }),
                        'Cantidad actualizada.',
                      )
                    }
                    disabled={cambiarCantidad.isPending}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="fs-btn fs-btn--fantasma fs-btn--s"
                  onClick={() => accion(quitar.mutateAsync(d.id_detalle_carrito), 'Prenda eliminada.')}
                  disabled={quitar.isPending}
                >
                  Quitar
                </button>
              </div>
            </div>

            <strong className="fs-nums">{moneda(subtotal(d.cantidad, d.precio_unitario))}</strong>
          </article>
        ))}
      </section>

      <aside className="fs-panel fs-resumen">
        <h3>Resumen</h3>
        <div className="fs-resumen__linea">
          <span>Prendas</span>
          <span className="fs-nums">{carrito.unidades}</span>
        </div>
        <div className="fs-resumen__linea">
          <span>Subtotal</span>
          <span className="fs-nums">{moneda(carrito.total)}</span>
        </div>
        <hr className="fs-divisor" />
        <div className="fs-resumen__total">
          <span>Total</span>
          <span className="fs-nums">{moneda(carrito.total)}</span>
        </div>
        <button type="button" className="fs-btn fs-btn--acento fs-btn--bloque" onClick={() => navegar('/checkout')}>
          Continuar con la compra
        </button>
        <Link to="/catalogo" className="fs-btn fs-btn--contorno fs-btn--bloque">
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}
