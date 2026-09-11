import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  email as validarEmail,
  hayErrores,
  longitudMinima,
  requerido,
  type Errores,
} from '../../lib/validacion';

interface Campos {
  nombre: string;
  email: string;
  password: string;
  confirmacion: string;
  telefono: string;
  direccion: string;
}

const INICIAL: Campos = {
  nombre: '',
  email: '',
  password: '',
  confirmacion: '',
  telefono: '',
  direccion: '',
};

export default function PaginaRegistro() {
  const { registrarse } = useAuth();
  const navegar = useNavigate();
  const [campos, setCampos] = useState<Campos>(INICIAL);
  const [errores, setErrores] = useState<Errores<Campos>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  function cambiar(clave: keyof Campos, valor: string) {
    setCampos((c) => ({ ...c, [clave]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;

    const nuevos: Errores<Campos> = {
      nombre: requerido(campos.nombre, 'Ingresa tu nombre completo'),
      email: validarEmail(campos.email),
      password: requerido(campos.password, 'Ingresa una contrasena') ?? longitudMinima(campos.password, 6),
      confirmacion: campos.password !== campos.confirmacion ? 'Las contrasenas no coinciden' : undefined,
    };
    setErrores(nuevos);
    if (hayErrores(nuevos)) return;

    setEnviando(true);
    setErrorGeneral('');
    try {
      await registrarse({
        nombre: campos.nombre.trim(),
        email: campos.email.trim(),
        password: campos.password,
        telefono: campos.telefono.trim(),
        direccion: campos.direccion.trim(),
      });
      navegar('/', { replace: true });
    } catch (error) {
      setErrorGeneral(error instanceof Error ? error.message : 'No pudimos crear tu cuenta.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fs-auth">
      <aside className="fs-auth__lado">
        <p className="fs-marca" style={{ color: '#fff' }}>
          Fashion<span style={{ color: 'var(--fs-oro)' }}>Store</span>
        </p>
        <h2>Crea tu cuenta</h2>
        <p style={{ color: 'rgba(250,247,243,.8)', maxWidth: '38ch' }}>
          Compra en linea, reserva prendas para probar en tienda y recibe recomendaciones personalizadas.
        </p>
      </aside>

      <div className="fs-auth__form">
        <form className="fs-auth__caja" onSubmit={enviar} noValidate>
          <div>
            <p className="fs-eyebrow">Nueva cuenta</p>
            <h1>Registrate</h1>
          </div>

          {errorGeneral && <div className="fs-alerta fs-alerta--error">{errorGeneral}</div>}

          <div className="fs-campo">
            <label htmlFor="nombre">Nombre completo</label>
            <input
              id="nombre"
              className={`fs-input${errores.nombre ? ' fs-input--error' : ''}`}
              value={campos.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
            />
            {errores.nombre && <span className="fs-campo-error">{errores.nombre}</span>}
          </div>

          <div className="fs-campo">
            <label htmlFor="email-registro">Correo electronico</label>
            <input
              id="email-registro"
              type="email"
              autoComplete="email"
              className={`fs-input${errores.email ? ' fs-input--error' : ''}`}
              value={campos.email}
              onChange={(e) => cambiar('email', e.target.value)}
            />
            {errores.email && <span className="fs-campo-error">{errores.email}</span>}
          </div>

          <div className="fs-rejilla-form">
            <div className="fs-campo">
              <label htmlFor="pass">Contrasena</label>
              <input
                id="pass"
                type="password"
                autoComplete="new-password"
                className={`fs-input${errores.password ? ' fs-input--error' : ''}`}
                value={campos.password}
                onChange={(e) => cambiar('password', e.target.value)}
              />
              {errores.password && <span className="fs-campo-error">{errores.password}</span>}
            </div>

            <div className="fs-campo">
              <label htmlFor="pass2">Repetir contrasena</label>
              <input
                id="pass2"
                type="password"
                autoComplete="new-password"
                className={`fs-input${errores.confirmacion ? ' fs-input--error' : ''}`}
                value={campos.confirmacion}
                onChange={(e) => cambiar('confirmacion', e.target.value)}
              />
              {errores.confirmacion && <span className="fs-campo-error">{errores.confirmacion}</span>}
            </div>
          </div>

          <div className="fs-rejilla-form">
            <div className="fs-campo">
              <label htmlFor="telefono">Telefono</label>
              <input
                id="telefono"
                className="fs-input"
                value={campos.telefono}
                onChange={(e) => cambiar('telefono', e.target.value)}
              />
            </div>
            <div className="fs-campo">
              <label htmlFor="direccion">Direccion</label>
              <input
                id="direccion"
                className="fs-input"
                value={campos.direccion}
                onChange={(e) => cambiar('direccion', e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="fs-btn fs-btn--acento fs-btn--bloque" disabled={enviando}>
            {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <p className="fs-sub">
            Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--fs-acento)' }}>Inicia sesion</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
