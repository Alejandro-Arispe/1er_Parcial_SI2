/**
 * Sesion del usuario. Es el unico estado verdaderamente global de la app.
 * El backend sigue siendo la autoridad de autorizacion: aqui solo resolvemos UX.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { obtenerToken, revisionSesion, suscribirSesion } from '../api/sesion';
import { authService, type CredencialesLogin, type DatosRegistro } from '../services/auth.service';
import { RolNombre, type Usuario } from '../types/domain';

interface ContextoAuth {
  usuario: Usuario | null;
  cargando: boolean;
  errorSesion: Error | null;
  reintentarSesion: () => void;
  autenticado: boolean;
  roles: string[];
  esCliente: boolean;
  idCliente: number | null;
  idSucursal: number | null;
  tieneRol: (...roles: string[]) => boolean;
  iniciarSesion: (credenciales: CredencialesLogin) => Promise<Usuario>;
  registrarse: (datos: DatosRegistro) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
}

const Contexto = createContext<ContextoAuth | null>(null);

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(() => Boolean(obtenerToken()));
  const [errorSesion, setErrorSesion] = useState<Error | null>(null);
  const [intento, setIntento] = useState(0);
  const queryClient = useQueryClient();

  useEffect(
    () =>
      suscribirSesion((externa) => {
        void queryClient.cancelQueries();
        queryClient.clear();
        setUsuario(null);
        setErrorSesion(null);
        setCargando(externa && Boolean(obtenerToken()));
        if (externa && obtenerToken()) setIntento((actual) => actual + 1);
      }),
    [queryClient],
  );

  // Rehidrata la sesion si hay token guardado.
  useEffect(() => {
    let activo = true;
    if (!obtenerToken()) return;
    const revision = revisionSesion();
    const vigente = () => activo && revision === revisionSesion();
    authService
      .perfil()
      .then((u) => vigente() && setUsuario(u))
      .catch((error: unknown) => {
        if (vigente())
          setErrorSesion(
            error instanceof Error ? error : new Error('No pudimos recuperar la sesion.'),
          );
      })
      .finally(() => vigente() && setCargando(false));
    return () => {
      activo = false;
    };
  }, [intento]);

  const reintentarSesion = useCallback(() => {
    setErrorSesion(null);
    setCargando(Boolean(obtenerToken()));
    setIntento((actual) => actual + 1);
  }, []);

  const iniciarSesion = useCallback(async (credenciales: CredencialesLogin) => {
    const u = await authService.login(credenciales);
    setUsuario(u);
    setErrorSesion(null);
    setCargando(false);
    return u;
  }, []);

  const registrarse = useCallback(async (datos: DatosRegistro) => {
    const u = await authService.registrar(datos);
    setUsuario(u);
    setErrorSesion(null);
    setCargando(false);
    return u;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await authService.logout();
    setUsuario(null);
    queryClient.clear();
  }, [queryClient]);

  const valor = useMemo<ContextoAuth>(() => {
    const roles = usuario?.roles.map((r) => String(r.nombre)) ?? [];
    return {
      usuario,
      cargando,
      errorSesion,
      reintentarSesion,
      autenticado: Boolean(usuario),
      roles,
      esCliente: roles.includes(RolNombre.CLIENTE),
      idCliente: usuario?.id_cliente ?? null,
      idSucursal: usuario?.id_sucursal ?? null,
      tieneRol: (...requeridos: string[]) => requeridos.some((r) => roles.includes(r)),
      iniciarSesion,
      registrarse,
      cerrarSesion,
    };
  }, [usuario, cargando, errorSesion, reintentarSesion, iniciarSesion, registrarse, cerrarSesion]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ContextoAuth {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth debe usarse dentro de ProveedorAuth');
  return ctx;
}
