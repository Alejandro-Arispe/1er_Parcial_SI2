import { RolNombre } from '../types/domain';

export interface EnlaceNav {
  a: string;
  texto: string;
  exacto?: boolean;
}

export interface GrupoNav {
  titulo: string;
  enlaces: EnlaceNav[];
}

const ADMIN: GrupoNav[] = [
  {
    titulo: 'General',
    enlaces: [
      { a: '/admin', texto: 'Dashboard', exacto: true },
      { a: '/admin/reportes', texto: 'Reportes' },
    ],
  },
  {
    titulo: 'Catalogo',
    enlaces: [
      { a: '/admin/productos', texto: 'Productos' },
      { a: '/admin/categorias', texto: 'Categorias' },
      { a: '/admin/tallas', texto: 'Tallas' },
      { a: '/admin/colores', texto: 'Colores' },
      { a: '/admin/temporadas', texto: 'Temporadas' },
      { a: '/admin/colecciones', texto: 'Colecciones' },
    ],
  },
  {
    titulo: 'Operaciones',
    enlaces: [
      { a: '/admin/inventario', texto: 'Inventario' },
      { a: '/admin/reservas', texto: 'Reservas' },
      { a: '/admin/ventas', texto: 'Ventas' },
    ],
  },
  {
    titulo: 'Organizacion',
    enlaces: [
      { a: '/admin/sucursales', texto: 'Sucursales' },
      { a: '/admin/proveedores', texto: 'Proveedores' },
      { a: '/admin/usuarios', texto: 'Usuarios' },
      { a: '/admin/roles', texto: 'Roles' },
    ],
  },
];

const SUCURSAL: GrupoNav[] = [
  {
    titulo: 'Mi sucursal',
    enlaces: [
      { a: '/sucursal/reservas', texto: 'Reservas' },
      { a: '/sucursal/inventario', texto: 'Inventario' },
      { a: '/sucursal/movimientos', texto: 'Movimientos' },
      { a: '/sucursal/ventas', texto: 'Ventas' },
    ],
  },
];

const CAJA: GrupoNav[] = [
  {
    titulo: 'Caja',
    enlaces: [
      { a: '/caja', texto: 'Punto de venta', exacto: true },
      { a: '/caja/ventas', texto: 'Ventas del dia' },
    ],
  },
];

const PROVEEDOR: GrupoNav[] = [
  {
    titulo: 'Proveedor',
    enlaces: [
      { a: '/proveedor/productos', texto: 'Mis productos' },
      { a: '/proveedor/entregas', texto: 'Entregas programadas' },
    ],
  },
];

/** Un usuario puede tener varios roles: se concatenan sus secciones. */
export function navegacionPorRol(roles: string[]): GrupoNav[] {
  const grupos: GrupoNav[] = [];
  if (roles.includes(RolNombre.ADMINISTRADOR)) grupos.push(...ADMIN);
  if (roles.includes(RolNombre.ENCARGADO_SUCURSAL)) grupos.push(...SUCURSAL);
  if (roles.includes(RolNombre.CAJERO)) grupos.push(...CAJA);
  if (roles.includes(RolNombre.PROVEEDOR)) grupos.push(...PROVEEDOR);
  return grupos;
}
