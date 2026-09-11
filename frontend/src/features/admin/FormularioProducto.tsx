import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import {
  useCategorias,
  useColecciones,
  useColores,
  useGuardarProducto,
  useTallas,
  useTemporadas,
} from '../../hooks/useCatalogo';
import { useProveedores } from '../../hooks/useOperaciones';
import { hayErrores, numeroPositivo, rangoPorcentaje, requerido, type Errores } from '../../lib/validacion';
import type { DatosProducto } from '../../services/catalogo.service';
import type { Producto } from '../../types/domain';

const VACIO: DatosProducto = {
  nombre: '',
  descripcion: '',
  precio: 0,
  imagen_url: '',
  descuento_pct: 0,
  promo_inicio: null,
  promo_fin: null,
  activo: true,
  id_categoria: 0,
  id_temporada: null,
  id_coleccion: null,
  id_proveedor: null,
  id_tallas: [],
  id_colores: [],
};

function aFormulario(p: Producto): DatosProducto {
  return {
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    imagen_url: p.imagen_url,
    descuento_pct: p.descuento_pct,
    promo_inicio: p.promo_inicio,
    promo_fin: p.promo_fin,
    activo: p.activo,
    id_categoria: p.id_categoria,
    id_temporada: p.id_temporada,
    id_coleccion: p.id_coleccion,
    id_proveedor: p.id_proveedor,
    id_tallas: p.tallas.map((t) => t.id_talla),
    id_colores: p.colores.map((c) => c.id_color),
  };
}

interface Props {
  abierto: boolean;
  producto: Producto | null;
  onCerrar: () => void;
}

export function FormularioProducto({ abierto, producto, onCerrar }: Props) {
  const categorias = useCategorias();
  const temporadas = useTemporadas();
  const colecciones = useColecciones();
  const proveedores = useProveedores();
  const tallas = useTallas();
  const colores = useColores();
  const guardar = useGuardarProducto();
  const toast = useToast();

  const [datos, setDatos] = useState<DatosProducto>(VACIO);
  const [errores, setErrores] = useState<Errores<DatosProducto>>({});

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setDatos(producto ? aFormulario(producto) : VACIO);
  }, [abierto, producto]);

  function cambiar<K extends keyof DatosProducto>(clave: K, valor: DatosProducto[K]) {
    setDatos((d) => ({ ...d, [clave]: valor }));
  }

  function alternarLista(clave: 'id_tallas' | 'id_colores', id: number) {
    setDatos((d) => {
      const actual = d[clave];
      return {
        ...d,
        [clave]: actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id],
      };
    });
  }

  async function enviar() {
    const nuevos: Errores<DatosProducto> = {
      nombre: requerido(datos.nombre, 'El nombre es obligatorio'),
      precio: numeroPositivo(datos.precio, 'El precio debe ser mayor a cero'),
      id_categoria: datos.id_categoria ? undefined : 'Selecciona una categoria',
      descuento_pct: rangoPorcentaje(datos.descuento_pct),
      id_tallas: requerido(datos.id_tallas, 'Selecciona al menos una talla'),
      id_colores: requerido(datos.id_colores, 'Selecciona al menos un color'),
    };
    setErrores(nuevos);
    if (hayErrores(nuevos)) return;

    try {
      await guardar.mutateAsync({ id: producto?.id_producto, datos });
      toast.exito(producto ? 'Producto actualizado.' : 'Producto creado.');
      onCerrar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos guardar el producto.');
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo={producto ? 'Editar producto' : 'Nuevo producto'}
      onCerrar={onCerrar}
      ancho
      pie={
        <>
          <button type="button" className="fs-btn fs-btn--contorno" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" className="fs-btn fs-btn--acento" onClick={enviar} disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando...' : 'Guardar producto'}
          </button>
        </>
      }
    >
      <div className="fs-pila">
        <div className="fs-campo">
          <label htmlFor="nombre-producto">Nombre</label>
          <input
            id="nombre-producto"
            className={`fs-input${errores.nombre ? ' fs-input--error' : ''}`}
            value={datos.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
          />
          {errores.nombre && <span className="fs-campo-error">{errores.nombre}</span>}
        </div>

        <div className="fs-campo">
          <label htmlFor="descripcion-producto">Descripcion</label>
          <textarea
            id="descripcion-producto"
            className="fs-textarea"
            value={datos.descripcion}
            onChange={(e) => cambiar('descripcion', e.target.value)}
          />
        </div>

        <div className="fs-rejilla-form">
          <div className="fs-campo">
            <label htmlFor="precio">Precio (Bs)</label>
            <input
              id="precio"
              type="number"
              min={0}
              step="0.01"
              className={`fs-input${errores.precio ? ' fs-input--error' : ''}`}
              value={datos.precio}
              onChange={(e) => cambiar('precio', Number(e.target.value))}
            />
            {errores.precio && <span className="fs-campo-error">{errores.precio}</span>}
          </div>

          <div className="fs-campo">
            <label htmlFor="categoria">Categoria</label>
            <select
              id="categoria"
              className={`fs-select${errores.id_categoria ? ' fs-select--error' : ''}`}
              value={datos.id_categoria || ''}
              onChange={(e) => cambiar('id_categoria', Number(e.target.value))}
            >
              <option value="">Selecciona</option>
              {categorias.data?.map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {errores.id_categoria && <span className="fs-campo-error">{errores.id_categoria}</span>}
          </div>

          <div className="fs-campo">
            <label htmlFor="temporada">Temporada</label>
            <select
              id="temporada"
              className="fs-select"
              value={datos.id_temporada ?? ''}
              onChange={(e) => cambiar('id_temporada', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sin temporada</option>
              {temporadas.data?.map((t) => (
                <option key={t.id_temporada} value={t.id_temporada}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="fs-campo">
            <label htmlFor="coleccion">Coleccion</label>
            <select
              id="coleccion"
              className="fs-select"
              value={datos.id_coleccion ?? ''}
              onChange={(e) => cambiar('id_coleccion', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sin coleccion</option>
              {colecciones.data?.map((c) => (
                <option key={c.id_coleccion} value={c.id_coleccion}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="fs-campo">
            <label htmlFor="proveedor">Proveedor</label>
            <select
              id="proveedor"
              className="fs-select"
              value={datos.id_proveedor ?? ''}
              onChange={(e) => cambiar('id_proveedor', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sin proveedor</option>
              {proveedores.data?.map((p) => (
                <option key={p.id_proveedor} value={p.id_proveedor}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="fs-campo">
            <label htmlFor="imagen">URL de imagen</label>
            <input
              id="imagen"
              className="fs-input"
              placeholder="https://..."
              value={datos.imagen_url}
              onChange={(e) => cambiar('imagen_url', e.target.value)}
            />
          </div>
        </div>

        <hr className="fs-divisor" />
        <p className="fs-eyebrow">Promocion</p>
        <div className="fs-rejilla-form">
          <div className="fs-campo">
            <label htmlFor="descuento">Descuento (%)</label>
            <input
              id="descuento"
              type="number"
              min={0}
              max={100}
              className={`fs-input${errores.descuento_pct ? ' fs-input--error' : ''}`}
              value={datos.descuento_pct}
              onChange={(e) => cambiar('descuento_pct', Number(e.target.value))}
            />
            {errores.descuento_pct && <span className="fs-campo-error">{errores.descuento_pct}</span>}
          </div>
          <div className="fs-campo">
            <label htmlFor="promo-inicio">Inicio de promocion</label>
            <input
              id="promo-inicio"
              type="date"
              className="fs-input"
              value={datos.promo_inicio ?? ''}
              onChange={(e) => cambiar('promo_inicio', e.target.value || null)}
            />
          </div>
          <div className="fs-campo">
            <label htmlFor="promo-fin">Fin de promocion</label>
            <input
              id="promo-fin"
              type="date"
              className="fs-input"
              value={datos.promo_fin ?? ''}
              onChange={(e) => cambiar('promo_fin', e.target.value || null)}
            />
          </div>
        </div>

        <hr className="fs-divisor" />
        <div className="fs-campo">
          <label>Tallas disponibles</label>
          <div className="fs-opciones">
            {tallas.data?.map((t) => (
              <button
                key={t.id_talla}
                type="button"
                className={`fs-chip${datos.id_tallas.includes(t.id_talla) ? ' fs-chip--activo' : ''}`}
                onClick={() => alternarLista('id_tallas', t.id_talla)}
              >
                {t.nombre}
              </button>
            ))}
          </div>
          {errores.id_tallas && <span className="fs-campo-error">{errores.id_tallas}</span>}
        </div>

        <div className="fs-campo">
          <label>Colores disponibles</label>
          <div className="fs-opciones">
            {colores.data?.map((c) => (
              <button
                key={c.id_color}
                type="button"
                className={`fs-chip fs-chip--color${datos.id_colores.includes(c.id_color) ? ' fs-chip--activo' : ''}`}
                onClick={() => alternarLista('id_colores', c.id_color)}
              >
                <span className="fs-punto-color" style={{ background: c.codigo_hex }} />
                {c.nombre}
              </button>
            ))}
          </div>
          {errores.id_colores && <span className="fs-campo-error">{errores.id_colores}</span>}
        </div>

        <label className="fs-check">
          <input type="checkbox" checked={datos.activo} onChange={(e) => cambiar('activo', e.target.checked)} />
          Producto visible en el catalogo
        </label>
      </div>
    </Modal>
  );
}
