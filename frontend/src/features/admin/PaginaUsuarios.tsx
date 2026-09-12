import { useEffect, useState } from 'react';
import { BadgeActivo } from '../../components/ui/Badges';
import { ErrorEstado, FilasSkeleton, Vacio } from '../../components/ui/Estados';
import { Confirmacion, Modal } from '../../components/ui/Modal';
import { Paginacion } from '../../components/ui/Paginacion';
import { useToast } from '../../context/ToastContext';
import {
  useDesactivarUsuario,
  useGuardarUsuario,
  useRoles,
  useSucursales,
  useUsuarios,
} from '../../hooks/useOperaciones';
import { email as validarEmail, hayErrores, requerido, type Errores } from '../../lib/validacion';
import type { DatosUsuario } from '../../services/organizacion.service';
import { fecha } from '../../lib/format';
import { RolNombre, type Usuario } from '../../types/domain';

const VACIO: DatosUsuario = {
  nombre: '',
  email: '',
  password: '',
  activo: true,
  id_roles: [],
  telefono: '',
  direccion: '',
  cargo: '',
  id_sucursal: null,
};

export default function PaginaUsuarios() {
  const [q, setQ] = useState('');
  const [idRol, setIdRol] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [editando, setEditando] = useState<Usuario | null | undefined>(undefined);
  const [datos, setDatos] = useState<DatosUsuario>(VACIO);
  const [errores, setErrores] = useState<Errores<DatosUsuario>>({});
  const [porDesactivar, setPorDesactivar] = useState<Usuario | null>(null);

  const roles = useRoles();
  const sucursales = useSucursales();
  const guardar = useGuardarUsuario();
  const desactivar = useDesactivarUsuario();
  const toast = useToast();

  const consulta = useUsuarios({ q: q || undefined, id_rol: idRol || undefined, page, page_size: 10 });

  useEffect(() => {
    if (editando === undefined) return;
    setErrores({});
    if (!editando) {
      setDatos(VACIO);
      return;
    }
    const u = editando as Usuario & Record<string, unknown>;
    setDatos({
      nombre: u.nombre,
      email: u.email,
      password: '',
      activo: u.activo,
      id_roles: u.roles.map((r) => r.id_rol),
      telefono: (u.telefono as string) ?? '',
      direccion: (u.direccion as string) ?? '',
      cargo: (u.cargo as string) ?? '',
      id_sucursal: (u.id_sucursal as number | null) ?? null,
    });
  }, [editando]);

  const esCliente = roles.data
    ?.filter((r) => datos.id_roles.includes(r.id_rol))
    .some((r) => r.nombre === RolNombre.CLIENTE);

  function alternarRol(id: number) {
    setDatos((d) => ({
      ...d,
      id_roles: d.id_roles.includes(id) ? d.id_roles.filter((x) => x !== id) : [...d.id_roles, id],
    }));
  }

  async function enviar() {
    const nuevos: Errores<DatosUsuario> = {
      nombre: requerido(datos.nombre, 'El nombre es obligatorio'),
      email: validarEmail(datos.email),
      id_roles: requerido(datos.id_roles, 'Asigna al menos un rol'),
      password: !editando ? requerido(datos.password, 'Define una contrasena inicial') : undefined,
    };
    setErrores(nuevos);
    if (hayErrores(nuevos)) return;

    try {
      await guardar.mutateAsync({ id: editando?.id_usuario, datos });
      toast.exito(editando ? 'Usuario actualizado.' : 'Usuario creado.');
      setEditando(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos guardar el usuario.');
    }
  }

  async function confirmarBaja() {
    if (!porDesactivar) return;
    try {
      await desactivar.mutateAsync(porDesactivar.id_usuario);
      toast.exito('Usuario desactivado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos desactivar el usuario.');
    } finally {
      setPorDesactivar(null);
    }
  }

  return (
    <>
      <header className="fs-pagina-cabecera">
        <div>
          <p className="fs-eyebrow">Organizacion</p>
          <h1>Usuarios</h1>
          <p className="fs-sub">Clientes, empleados y proveedores con acceso al sistema.</p>
        </div>
        <button type="button" className="fs-btn fs-btn--acento" onClick={() => setEditando(null)}>
          Nuevo usuario
        </button>
      </header>

      <section className="fs-tarjeta fs-tarjeta--pad fs-pila">
        <div className="fs-fila-wrap">
          <div className="fs-campo fs-crecer" style={{ minWidth: 220 }}>
            <label htmlFor="buscar-usuario">Buscar</label>
            <input
              id="buscar-usuario"
              className="fs-input"
              placeholder="Nombre o correo"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="fs-campo" style={{ minWidth: 200 }}>
            <label htmlFor="filtro-rol">Rol</label>
            <select
              id="filtro-rol"
              className="fs-select"
              value={idRol}
              onChange={(e) => {
                setIdRol(e.target.value ? Number(e.target.value) : '');
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {roles.data?.map((r) => (
                <option key={r.id_rol} value={r.id_rol}>
                  {String(r.nombre)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {consulta.isPending && <FilasSkeleton />}
        {consulta.isError && <ErrorEstado error={consulta.error} onReintentar={() => consulta.refetch()} />}
        {consulta.data && consulta.data.items.length === 0 && (
          <Vacio titulo="Sin usuarios" mensaje="No hay usuarios que coincidan con el filtro." />
        )}

        {consulta.data && consulta.data.items.length > 0 && (
          <>
            <div className="fs-tabla-scroll">
              <table className="fs-tabla">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Roles</th>
                    <th>Registro</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {consulta.data.items.map((u) => (
                    <tr key={u.id_usuario}>
                      <td>{u.nombre}</td>
                      <td className="fs-sub">{u.email}</td>
                      <td>
                        <div className="fs-fila-wrap" style={{ gap: 6 }}>
                          {u.roles.map((r) => (
                            <span key={r.id_rol} className="fs-badge">
                              {String(r.nombre)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{fecha(u.fecha_registro)}</td>
                      <td>
                        <BadgeActivo activo={u.activo} />
                      </td>
                      <td className="fs-td-acciones">
                        <button
                          type="button"
                          className="fs-btn fs-btn--contorno fs-btn--s"
                          onClick={() => setEditando(u)}
                        >
                          Editar
                        </button>
                        {u.activo && (
                          <button
                            type="button"
                            className="fs-btn fs-btn--fantasma fs-btn--s"
                            onClick={() => setPorDesactivar(u)}
                          >
                            Desactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion
              page={consulta.data.page}
              pageSize={consulta.data.page_size}
              total={consulta.data.total}
              onCambiar={setPage}
            />
          </>
        )}
      </section>

      <Modal
        abierto={editando !== undefined}
        titulo={editando ? 'Editar usuario' : 'Nuevo usuario'}
        onCerrar={() => setEditando(undefined)}
        ancho
        pie={
          <>
            <button type="button" className="fs-btn fs-btn--contorno" onClick={() => setEditando(undefined)}>
              Cancelar
            </button>
            <button type="button" className="fs-btn fs-btn--acento" onClick={enviar} disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="fs-pila">
          <div className="fs-rejilla-form">
            <div className="fs-campo">
              <label htmlFor="nombre-usuario">Nombre completo</label>
              <input
                id="nombre-usuario"
                className={`fs-input${errores.nombre ? ' fs-input--error' : ''}`}
                value={datos.nombre}
                onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
              />
              {errores.nombre && <span className="fs-campo-error">{errores.nombre}</span>}
            </div>
            <div className="fs-campo">
              <label htmlFor="email-usuario">Correo</label>
              <input
                id="email-usuario"
                type="email"
                className={`fs-input${errores.email ? ' fs-input--error' : ''}`}
                value={datos.email}
                onChange={(e) => setDatos({ ...datos, email: e.target.value })}
              />
              {errores.email && <span className="fs-campo-error">{errores.email}</span>}
            </div>
            <div className="fs-campo">
              <label htmlFor="password-usuario">
                {editando ? 'Nueva contrasena (opcional)' : 'Contrasena inicial'}
              </label>
              <input
                id="password-usuario"
                type="password"
                className={`fs-input${errores.password ? ' fs-input--error' : ''}`}
                value={datos.password}
                onChange={(e) => setDatos({ ...datos, password: e.target.value })}
              />
              {errores.password && <span className="fs-campo-error">{errores.password}</span>}
            </div>
          </div>

          <div className="fs-campo">
            <label>Roles</label>
            <div className="fs-opciones">
              {roles.data?.map((r) => (
                <button
                  key={r.id_rol}
                  type="button"
                  className={`fs-chip${datos.id_roles.includes(r.id_rol) ? ' fs-chip--activo' : ''}`}
                  onClick={() => alternarRol(r.id_rol)}
                >
                  {String(r.nombre)}
                </button>
              ))}
            </div>
            {errores.id_roles && <span className="fs-campo-error">{errores.id_roles}</span>}
          </div>

          {esCliente ? (
            <div className="fs-rejilla-form">
              <div className="fs-campo">
                <label htmlFor="telefono-usuario">Telefono</label>
                <input
                  id="telefono-usuario"
                  className="fs-input"
                  value={datos.telefono}
                  onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
                />
              </div>
              <div className="fs-campo">
                <label htmlFor="direccion-usuario">Direccion</label>
                <input
                  id="direccion-usuario"
                  className="fs-input"
                  value={datos.direccion}
                  onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="fs-rejilla-form">
              <div className="fs-campo">
                <label htmlFor="cargo-usuario">Cargo</label>
                <input
                  id="cargo-usuario"
                  className="fs-input"
                  value={datos.cargo}
                  onChange={(e) => setDatos({ ...datos, cargo: e.target.value })}
                />
              </div>
              <div className="fs-campo">
                <label htmlFor="sucursal-usuario">Sucursal asignada</label>
                <select
                  id="sucursal-usuario"
                  className="fs-select"
                  value={datos.id_sucursal ?? ''}
                  onChange={(e) =>
                    setDatos({ ...datos, id_sucursal: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">Sin sucursal</option>
                  {sucursales.data?.map((s) => (
                    <option key={s.id_sucursal} value={s.id_sucursal}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <label className="fs-check">
            <input
              type="checkbox"
              checked={datos.activo}
              onChange={(e) => setDatos({ ...datos, activo: e.target.checked })}
            />
            Usuario activo
          </label>
        </div>
      </Modal>

      <Confirmacion
        abierto={porDesactivar !== null}
        titulo="Desactivar usuario"
        mensaje="El usuario no podra iniciar sesion, pero se conserva su historial."
        textoConfirmar="Desactivar"
        peligro
        cargando={desactivar.isPending}
        onConfirmar={confirmarBaja}
        onCancelar={() => setPorDesactivar(null)}
      />
    </>
  );
}
