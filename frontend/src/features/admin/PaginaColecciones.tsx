import { BadgeActivo } from '../../components/ui/Badges';
import { catalogoService } from '../../services/catalogo.service';
import { claves } from '../../hooks/claves';
import { useTemporadas } from '../../hooks/useCatalogo';
import type { Coleccion } from '../../types/domain';
import { CrudSimple } from './CrudSimple';

export default function PaginaColecciones() {
  const temporadas = useTemporadas();

  return (
    <CrudSimple<Coleccion>
      titulo="Colecciones"
      descripcion="Agrupaciones comerciales dentro de una temporada."
      nombreSingular="Coleccion"
      claveCache={claves.colecciones}
      cargar={catalogoService.listarColecciones}
      crear={(datos) => catalogoService.crearColeccion(datos as Omit<Coleccion, 'id_coleccion'>)}
      actualizar={(id, datos) => catalogoService.actualizarColeccion(id, datos)}
      eliminar={(id) => catalogoService.eliminarColeccion(id)}
      idDe={(c) => c.id_coleccion}
      nuevo={{ nombre: '', descripcion: '', activa: true, id_temporada: null }}
      columnas={[
        { titulo: 'Nombre', render: (c) => c.nombre },
        {
          titulo: 'Temporada',
          render: (c) =>
            temporadas.data?.find((t) => t.id_temporada === c.id_temporada)?.nombre ?? (
              <span className="fs-sub">Sin temporada</span>
            ),
        },
        { titulo: 'Estado', render: (c) => <BadgeActivo activo={c.activa} /> },
      ]}
      campos={[
        { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
        { clave: 'descripcion', etiqueta: 'Descripcion', tipo: 'textarea' },
        {
          clave: 'id_temporada',
          etiqueta: 'Temporada',
          tipo: 'select',
          opciones: temporadas.data?.map((t) => ({ valor: t.id_temporada, texto: t.nombre })) ?? [],
        },
        { clave: 'activa', etiqueta: 'Coleccion activa', tipo: 'checkbox' },
      ]}
    />
  );
}
