import { rolesService } from '../../services/organizacion.service';
import { claves } from '../../hooks/claves';
import type { Rol } from '../../types/domain';
import { CrudSimple } from './CrudSimple';

export default function PaginaRoles() {
  return (
    <CrudSimple<Rol>
      titulo="Roles"
      descripcion="Perfiles de acceso. El backend valida los permisos reales de cada rol."
      nombreSingular="Rol"
      claveCache={claves.roles}
      cargar={rolesService.listar}
      crear={(datos) => rolesService.crear(datos as Omit<Rol, 'id_rol'>)}
      actualizar={(id, datos) => rolesService.actualizar(id, datos)}
      eliminar={(id) => rolesService.eliminar(id)}
      idDe={(r) => r.id_rol}
      nuevo={{ nombre: '', descripcion: '' }}
      columnas={[
        { titulo: 'Rol', render: (r) => String(r.nombre) },
        { titulo: 'Descripcion', render: (r) => <span className="fs-sub">{r.descripcion}</span> },
      ]}
      campos={[
        { clave: 'nombre', etiqueta: 'Nombre', requerido: true, ayuda: 'Se recomienda usar mayusculas, por ejemplo CAJERO.' },
        { clave: 'descripcion', etiqueta: 'Descripcion', tipo: 'textarea' },
      ]}
    />
  );
}
