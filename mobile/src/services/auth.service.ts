/**
 * Autenticacion.
 * Endpoints esperados:
 *   POST /auth/login     -> { access_token, usuario }
 *   POST /auth/registro  -> { access_token, usuario }
 *   GET  /auth/perfil    -> Usuario
 *   POST /auth/logout    -> { ok }
 */
import { api } from '../api/http';
import { guardarToken } from '../api/almacenamiento';
import { endpoints } from '../api/endpoints';
import type { Usuario } from '../types/domain';

export interface CredencialesLogin {
  email: string;
  password: string;
}

export interface DatosRegistro {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  direccion?: string;
}

export interface RespuestaSesion {
  access_token: string;
  usuario: Usuario;
}

export const authService = {
  async login(credenciales: CredencialesLogin): Promise<Usuario> {
    const data = await api.post<RespuestaSesion>(endpoints.auth.login, credenciales);
    guardarToken(data.access_token);
    return data.usuario;
  },

  async registrar(datos: DatosRegistro): Promise<Usuario> {
    const data = await api.post<RespuestaSesion>(endpoints.auth.registro, datos);
    guardarToken(data.access_token);
    return data.usuario;
  },

  perfil(): Promise<Usuario> {
    return api.get<Usuario>(endpoints.auth.perfil);
  },

  async logout(): Promise<void> {
    try {
      await api.post(endpoints.auth.logout);
    } finally {
      guardarToken(null);
    }
  },
};
