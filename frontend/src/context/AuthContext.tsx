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
import { obtenerToken } from '../api/http';
import { authService, type CredencialesLogin, type DatosRegistro } from '../services/auth.service';
import { RolNombre, type Cliente, type Empleado, type Usuario } from '../types/domain';

interface ContextoAuth {
  usuario: Usuario | null;
  cargando: boolean;
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
  const [cargando, setCargando] = useState(true);
  const queryClient = useQueryClient();

  // Rehidrata la sesion si hay token guardado.
  useEffect(() => {
    let activo = true;
    if (!obtenerToken()) {
      setCargando(false);
      return;
    }
    authService
      .perfil()
      .then((u) => activo && setUsuario(u))
      .catch(() => activo && setUsuario(null))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, []);

  const iniciarSesion = useCallback(
    async (credenciales: CredencialesLogin) => {
      const u = await authService.login(credenciales);
      setUsuario(u);
      queryClient.clear();
      return u;
    },
    [queryClient],
  );

  const registrarse = useCallback(
    async (datos: DatosRegistro) => {
      const u = await authService.registrar(datos);
      setUsuario(u);
      queryClient.clear();
      return u;
    },
    [queryClient],
  );

  const cerrarSesion = useCallback(async () => {
    await authService.logout();
    setUsuario(null);
    queryClient.clear();
  }, [queryClient]);

  const valor = useMemo<ContextoAuth>(() => {
    const roles = usuario?.roles.map((r) => String(r.nombre)) ?? [];
    const cliente = usuario as Cliente | null;
    const empleado = usuario as Empleado | null;
    return {
      usuario,
      cargando,
      autenticado: Boolean(usuario),
      roles,
      esCliente: roles.includes(RolNombre.CLIENTE),
      idCliente: cliente?.id_cliente ?? null,
      idSucursal: empleado?.id_sucursal ?? null,
      tieneRol: (...requeridos: string[]) => requeridos.some((r) => roles.includes(r)),
      iniciarSesion,
      registrarse,
      cerrarSesion,
    };
  }, [usuario, cargando, iniciarSesion, registrarse, cerrarSesion]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ContextoAuth {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth debe usarse dentro de ProveedorAuth');
  return ctx;
}
