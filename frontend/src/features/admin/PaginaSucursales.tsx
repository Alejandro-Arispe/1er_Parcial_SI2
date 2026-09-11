import { BadgeActivo } from '../../components/ui/Badges';
import { sucursalesService } from '../../services/organizacion.service';
import { claves } from '../../hooks/claves';
import type { Sucursal } from '../../types/domain';
import { CrudSimple } from './CrudSimple';

export default function PaginaSucursales() {
  return (
    <CrudSimple<Sucursal>
      titulo="Sucursales"
      descripcion="Tiendas fisicas donde se mantiene inventario y se atienden reservas."
      nombreSingular="Sucursal"
      claveCache={claves.sucursales}
      cargar={sucursalesService.listar}
      crear={(datos) => sucursalesService.crear(datos as Omit<Sucursal, 'id_sucursal'>)}
      actualizar={(id, datos) => sucursalesService.actualizar(id, datos)}
      eliminar={(id) => sucursalesService.eliminar(id)}
      idDe={(s) => s.id_sucursal}
      nuevo={{ nombre: '', ciudad: '', direccion: '', telefono: '', activa: true }}
      columnas={[
        { titulo: 'Nombre', render: (s) => s.nombre },
        { titulo: 'Ciudad', render: (s) => s.ciudad },
        { titulo: 'Direccion', render: (s) => <span className="fs-sub">{s.direccion}</span> },
        { titulo: 'Telefono', render: (s) => s.telefono },
        { titulo: 'Estado', render: (s) => <BadgeActivo activo={s.activa} /> },
      ]}
      campos={[
        { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
        { clave: 'ciudad', etiqueta: 'Ciudad', requerido: true },
        { clave: 'direccion', etiqueta: 'Direccion', requerido: true },
        { clave: 'telefono', etiqueta: 'Telefono' },
        { clave: 'activa', etiqueta: 'Sucursal activa', tipo: 'checkbox' },
      ]}
    />
  );
}
