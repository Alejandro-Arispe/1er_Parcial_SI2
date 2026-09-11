import { BadgeActivo } from '../../components/ui/Badges';
import { proveedoresService } from '../../services/organizacion.service';
import { claves } from '../../hooks/claves';
import type { Proveedor } from '../../types/domain';
import { CrudSimple } from './CrudSimple';

export default function PaginaProveedores() {
  return (
    <CrudSimple<Proveedor>
      titulo="Proveedores"
      descripcion="Empresas que suministran las prendas del catalogo."
      nombreSingular="Proveedor"
      claveCache={claves.proveedores}
      cargar={proveedoresService.listar}
      crear={(datos) => proveedoresService.crear(datos as Omit<Proveedor, 'id_proveedor'>)}
      actualizar={(id, datos) => proveedoresService.actualizar(id, datos)}
      eliminar={(id) => proveedoresService.eliminar(id)}
      idDe={(p) => p.id_proveedor}
      nuevo={{ nombre: '', contacto: '', telefono: '', email: '', activo: true }}
      columnas={[
        { titulo: 'Proveedor', render: (p) => p.nombre },
        { titulo: 'Contacto', render: (p) => p.contacto },
        { titulo: 'Telefono', render: (p) => p.telefono },
        { titulo: 'Email', render: (p) => <span className="fs-sub">{p.email}</span> },
        { titulo: 'Estado', render: (p) => <BadgeActivo activo={p.activo} /> },
      ]}
      campos={[
        { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
        { clave: 'contacto', etiqueta: 'Persona de contacto' },
        { clave: 'telefono', etiqueta: 'Telefono' },
        { clave: 'email', etiqueta: 'Correo electronico' },
        { clave: 'activo', etiqueta: 'Proveedor activo', tipo: 'checkbox' },
      ]}
    />
  );
}
