import { Link } from 'react-router-dom';
import { ErrorEstado, RejillaSkeleton } from '../../components/ui/Estados';
import { useAuth } from '../../context/AuthContext';
import { useCategorias, useProductos } from '../../hooks/useCatalogo';
import { useRecomendaciones } from '../../hooks/useOperaciones';
import { TarjetaProducto } from './TarjetaProducto';

export default function PaginaInicio() {
  const novedades = useProductos({ page_size: 8, orden: 'nombre' });
  const promociones = useProductos({ page_size: 4, solo_promocion: true, orden: 'descuento' });
  const categorias = useCategorias();
  const { autenticado, esCliente } = useAuth();
  const recomendaciones = useRecomendaciones({ limite: 4 }, autenticado && esCliente);

  return (
    <>
      <section className="fs-hero">
        <div className="fs-contenedor fs-hero__inner">
          <div>
            <p className="fs-eyebrow" style={{ color: 'rgba(250,247,243,.7)' }}>
              Primavera - Verano 2026
            </p>
            <h1>Encuentra tu prenda, pruebatela en tienda</h1>
            <p>
              Compra en linea o reserva tus prendas favoritas y pasa a probarlas en la sucursal que elijas.
              Stock en tiempo real de todas nuestras tiendas.
            </p>
            <div className="fs-hero__acciones">
              <Link to="/catalogo" className="fs-btn fs-btn--acento">
                Ver catalogo
              </Link>
              <Link to="/reservas/nueva" className="fs-btn fs-btn--contorno">
                Reservar para probar
              </Link>
            </div>
          </div>

          <div className="fs-hero__panel">
            <div className="fs-hero__dato">
              <strong>3 sucursales</strong>
              <span>Santa Cruz y La Paz, con stock consultable por prenda.</span>
            </div>
            <div className="fs-hero__dato">
              <strong>Reserva y prueba</strong>
              <span>Elige varias prendas, tallas y colores para probarte en tienda.</span>
            </div>
            <div className="fs-hero__dato">
              <strong>Asistente de estilo</strong>
              <span>Recomendaciones segun lo que buscas y el stock disponible.</span>
            </div>
          </div>
        </div>
      </section>

      <div className="fs-contenedor">
        {categorias.data && categorias.data.length > 0 && (
          <section className="fs-seccion" style={{ paddingTop: 0 }}>
            <div className="fs-fila-wrap">
              {categorias.data.map((c) => (
                <Link
                  key={c.id_categoria}
                  to={`/catalogo?id_categoria=${c.id_categoria}`}
                  className="fs-chip"
                >
                  {c.nombre}
                </Link>
              ))}
            </div>
          </section>
        )}

        {recomendaciones.data && recomendaciones.data.length > 0 && (
          <section className="fs-seccion">
            <div className="fs-seccion__cabecera">
              <div>
                <p className="fs-eyebrow">Para ti</p>
                <h2>Seleccion recomendada</h2>
              </div>
            </div>
            <div className="fs-rejilla-productos">
              {recomendaciones.data
                .filter((r) => r.producto)
                .map((r) => (
                  <TarjetaProducto key={r.id_recomendacion} producto={r.producto!} />
                ))}
            </div>
          </section>
        )}

        <section className="fs-seccion">
          <div className="fs-seccion__cabecera">
            <div>
              <p className="fs-eyebrow">Promociones</p>
              <h2>Descuentos vigentes</h2>
            </div>
            <Link to="/catalogo?solo_promocion=true" className="fs-btn fs-btn--contorno fs-btn--s">
              Ver todas
            </Link>
          </div>
          {promociones.isPending && <RejillaSkeleton cantidad={4} />}
          {promociones.isError && <ErrorEstado error={promociones.error} onReintentar={() => promociones.refetch()} />}
          {promociones.data && (
            <div className="fs-rejilla-productos">
              {promociones.data.items.map((p) => (
                <TarjetaProducto key={p.id_producto} producto={p} prioritaria />
              ))}
            </div>
          )}
        </section>

        <section className="fs-seccion">
          <div className="fs-seccion__cabecera">
            <div>
              <p className="fs-eyebrow">Catalogo</p>
              <h2>Novedades de la coleccion</h2>
            </div>
            <Link to="/catalogo" className="fs-btn fs-btn--contorno fs-btn--s">
              Ver catalogo
            </Link>
          </div>
          {novedades.isPending && <RejillaSkeleton />}
          {novedades.isError && <ErrorEstado error={novedades.error} onReintentar={() => novedades.refetch()} />}
          {novedades.data && (
            <div className="fs-rejilla-productos">
              {novedades.data.items.map((p) => (
                <TarjetaProducto key={p.id_producto} producto={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
