/**
 * Catalogo y disponibilidad.
 * Endpoints esperados:
 *   GET /productos?q&id_categoria&...              -> Paginado<Producto>
 *   GET /productos/:id                             -> Producto
 *   GET /productos/:id/recursos-ra                 -> RecursoRA[]
 *   GET /categorias | /tallas | /colores | /temporadas | /colecciones
 *   GET /sucursales                                -> Sucursal[]
 *   GET /inventario/disponibilidad?id_producto&... -> Inventario[]
 */
import { api } from '../api/http';
import { endpoints } from '../api/endpoints';
import type { Paginado, ParamsPaginacion } from '../types/api';
import type {
  Categoria,
  Coleccion,
  Color,
  Inventario,
  Producto,
  RecursoRA,
  Sucursal,
  Talla,
  Temporada,
} from '../types/domain';

export type OrdenCatalogo = 'precio_asc' | 'precio_desc' | 'nombre' | 'descuento';

export interface FiltrosProducto extends ParamsPaginacion {
  q?: string;
  id_categoria?: number;
  id_talla?: number;
  id_color?: number;
  id_coleccion?: number;
  id_temporada?: number;
  id_sucursal?: number;
  precio_min?: number;
  precio_max?: number;
  solo_promocion?: boolean;
  solo_disponibles?: boolean;
  orden?: OrdenCatalogo;
}

export interface ConsultaDisponibilidad {
  id_producto: number;
  id_talla?: number;
  id_color?: number;
  id_sucursal?: number;
}

export const catalogoService = {
  listarProductos(filtros: FiltrosProducto = {}) {
    return api.get<Paginado<Producto>>(endpoints.catalogo.productos, filtros);
  },
  obtenerProducto(id: number) {
    return api.get<Producto>(endpoints.catalogo.producto(id));
  },
  recursosRA(idProducto: number) {
    return api.get<RecursoRA[]>(endpoints.catalogo.recursosRA(idProducto));
  },
  listarCategorias() {
    return api.get<Categoria[]>(endpoints.catalogo.categorias);
  },
  listarTallas() {
    return api.get<Talla[]>(endpoints.catalogo.tallas);
  },
  listarColores() {
    return api.get<Color[]>(endpoints.catalogo.colores);
  },
  listarTemporadas() {
    return api.get<Temporada[]>(endpoints.catalogo.temporadas);
  },
  listarColecciones() {
    return api.get<Coleccion[]>(endpoints.catalogo.colecciones);
  },
  listarSucursales() {
    return api.get<Sucursal[]>(endpoints.sucursales.lista);
  },
  disponibilidad(consulta: ConsultaDisponibilidad) {
    return api.get<Inventario[]>(endpoints.inventario.disponibilidad, consulta);
  },
};
