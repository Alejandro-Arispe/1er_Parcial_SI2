/**
 * Pantalla CRUD reutilizable para los catalogos de apoyo
 * (categorias, tallas, colores, temporadas, colecciones, sucursales, proveedores, roles).
 * Evita repetir ocho tablas casi identicas.
 */
import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ErrorEstado, FilasSkeleton, Vacio } from '../../components/ui/Estados';
import { Confirmacion, Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { hayErrores, requerido, type Errores } from '../../lib/validacion';

export interface ColumnaCrud<T> {
  titulo: string;
  render: (item: T) => ReactNode;
  num?: boolean;
}

export interface CampoCrud<T> {
  clave: keyof T & string;
  etiqueta: string;
  tipo?: 'texto' | 'numero' | 'fecha' | 'checkbox' | 'select' | 'color' | 'textarea';
  opciones?: Array<{ valor: string | number; texto: string }>;
  requerido?: boolean;
  ayuda?: string;
}

interface Props<T> {
  titulo: string;
  descripcion: string;
  claveCache: QueryKey;
  cargar: () => Promise<T[]>;
  crear: (datos: Partial<T>) => Promise<unknown>;
  actualizar: (id: number, datos: Partial<T>) => Promise<unknown>;
  eliminar?: (id: number) => Promise<unknown>;
  idDe: (item: T) => number;
  columnas: Array<ColumnaCrud<T>>;
  campos: Array<CampoCrud<T>>;
  nuevo: Partial<T>;
  nombreSingular: string;
}

export function CrudSimple<T extends Record<string, any>>({
  titulo,
  descripcion,
  claveCache,
  cargar,
  crear,
  actualizar,
  eliminar,
  idDe,
  columnas,
  campos,
  nuevo,
  nombreSingular,
}: Props<T>) {
  const qc = useQueryClient();
  const toast = useToast();
  const consulta = useQuery({ queryKey: claveCache, queryFn: cargar });

  const [editando, setEditando] = useState<Partial<T> | null>(null);
  const [errores, setErrores] = useState<Errores<T>>({});
  const [porEliminar, setPorEliminar] = useState<T | null>(null);

  const guardar = useMutation({
    mutationFn: async (datos: Partial<T>) => {
      const id = (datos as any).__id as number | undefined;
      const { __id, ...limpio } = datos as any;
      return id ? actualizar(id, limpio) : crear(limpio);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: claveCache });
      toast.exito(`${nombreSingular} guardado correctamente.`);
      setEditando(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No pudimos guardar.'),
  });

  const borrar = useMutation({
    mutationFn: (id: number) => eliminar!(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: claveCache });
      toast.exito(`${nombreSingular} eliminado.`);
      setPorEliminar(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No pudimos eliminar el registro.');
      setPorEliminar(null);
    },
  });

  function abrirNuevo() {
    setErrores({});
    setEditando({ ...nuevo });
  }

  function abrirEdicion(item: T) {
    setErrores({});
    setEditando({ ...item, __id: idDe(item) } as any);
  }

  function enviar() {
    if (!editando) return;
    const nuevos: Errores<T> = {};
    for (const campo of campos) {
      if (campo.requerido) {
        const error = requerido(editando[campo.clave]);
        if (error) nuevos[campo.clave] = error;
      }
    }
    setErrores(nuevos);
    if (hayErrores(nuevos)) return;
    guardar.mutate(editando);
  }

  function cambiar(clave: string, valor: unknown) {
    setEditando((actual) => ({ ...(actual ?? {}), [clave]: valor }) as Partial<T>);
  }

  return (
    <>
      <header className="fs-pagina-cabecera">
        <div>
          <p className="fs-eyebrow">Administracion</p>
          <h1>{titulo}</h1>
          <p className="fs-sub">{descripcion}</p>
        </div>
        <button type="button" className="fs-btn fs-btn--acento" onClick={abrirNuevo}>
          Agregar {nombreSingular.toLowerCase()}
        </button>
      </header>

      <section className="fs-tarjeta fs-tarjeta--pad">
        {consulta.isPending && <FilasSkeleton />}
        {consulta.isError && <ErrorEstado error={consulta.error} onReintentar={() => consulta.refetch()} />}

        {consulta.data && consulta.data.length === 0 && (
          <Vacio
            titulo={`Sin ${titulo.toLowerCase()}`}
            mensaje="Todavia no hay registros cargados en esta seccion."
            accion={
              <button type="button" className="fs-btn fs-btn--acento" onClick={abrirNuevo}>
                Crear el primero
              </button>
            }
          />
        )}

        {consulta.data && consulta.data.length > 0 && (
          <div className="fs-tabla-scroll">
            <table className="fs-tabla">
              <thead>
                <tr>
                  {columnas.map((c) => (
                    <th key={c.titulo} className={c.num ? 'fs-tabla-num' : undefined}>
                      {c.titulo}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {consulta.data.map((item) => (
                  <tr key={idDe(item)}>
                    {columnas.map((c) => (
                      <td key={c.titulo} className={c.num ? 'fs-tabla-num' : undefined}>
                        {c.render(item)}
                      </td>
                    ))}
                    <td className="fs-td-acciones">
                      <button
                        type="button"
                        className="fs-btn fs-btn--contorno fs-btn--s"
                        onClick={() => abrirEdicion(item)}
                      >
                        Editar
                      </button>
                      {eliminar && (
                        <button
                          type="button"
                          className="fs-btn fs-btn--fantasma fs-btn--s"
                          onClick={() => setPorEliminar(item)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        abierto={editando !== null}
        titulo={(editando as any)?.__id ? `Editar ${nombreSingular.toLowerCase()}` : `Agregar ${nombreSingular.toLowerCase()}`}
        onCerrar={() => setEditando(null)}
        pie={
          <>
            <button type="button" className="fs-btn fs-btn--contorno" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button type="button" className="fs-btn fs-btn--acento" onClick={enviar} disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="fs-rejilla-form">
          {campos.map((campo) => {
            const valor = editando?.[campo.clave];
            const error = errores[campo.clave];
            return (
              <div className="fs-campo" key={campo.clave}>
                {campo.tipo === 'checkbox' ? (
                  <label className="fs-check">
                    <input
                      type="checkbox"
                      checked={Boolean(valor)}
                      onChange={(e) => cambiar(campo.clave, e.target.checked)}
                    />
                    {campo.etiqueta}
                  </label>
                ) : (
                  <>
                    <label htmlFor={campo.clave}>{campo.etiqueta}</label>
                    {campo.tipo === 'select' ? (
                      <select
                        id={campo.clave}
                        className={`fs-select${error ? ' fs-select--error' : ''}`}
                        value={(valor as string) ?? ''}
                        onChange={(e) =>
                          cambiar(campo.clave, e.target.value === '' ? null : Number(e.target.value))
                        }
                      >
                        <option value="">Sin asignar</option>
                        {campo.opciones?.map((o) => (
                          <option key={o.valor} value={o.valor}>
                            {o.texto}
                          </option>
                        ))}
                      </select>
                    ) : campo.tipo === 'textarea' ? (
                      <textarea
                        id={campo.clave}
                        className="fs-textarea"
                        value={(valor as string) ?? ''}
                        onChange={(e) => cambiar(campo.clave, e.target.value)}
                      />
                    ) : (
                      <input
                        id={campo.clave}
                        type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : campo.tipo === 'color' ? 'color' : 'text'}
                        className={`fs-input${error ? ' fs-input--error' : ''}`}
                        value={(valor as string) ?? ''}
                        onChange={(e) =>
                          cambiar(campo.clave, campo.tipo === 'numero' ? Number(e.target.value) : e.target.value)
                        }
                      />
                    )}
                  </>
                )}
                {campo.ayuda && <span className="fs-campo-ayuda">{campo.ayuda}</span>}
                {error && <span className="fs-campo-error">{error}</span>}
              </div>
            );
          })}
        </div>
      </Modal>

      <Confirmacion
        abierto={porEliminar !== null}
        titulo={`Eliminar ${nombreSingular.toLowerCase()}`}
        mensaje="Esta accion no se puede deshacer. Quieres continuar?"
        textoConfirmar="Eliminar"
        peligro
        cargando={borrar.isPending}
        onConfirmar={() => porEliminar && borrar.mutate(idDe(porEliminar))}
        onCancelar={() => setPorEliminar(null)}
      />
    </>
  );
}
