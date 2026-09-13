import type { QueryClient } from '@tanstack/react-query';

/** Las relaciones expandidas y la disponibilidad tambien cambian al editar los maestros. */
export function invalidarCatalogo(qc: QueryClient) {
  return Promise.all(
    [
      'productos',
      'producto',
      'recursos-ra',
      'disponibilidad',
      'inventario',
      'categorias',
      'tallas',
      'colores',
      'temporadas',
      'colecciones',
      'sucursales',
      'proveedores',
      'proveedor-productos',
      'usuarios',
    ].map((key) => qc.invalidateQueries({ queryKey: [key] })),
  );
}
