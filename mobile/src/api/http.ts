/**
 * Adaptador HTTP unico de la aplicacion movil.
 *
 *   Pantalla -> hook -> servicio -> api (este archivo) -> NestJS | mock
 *
 * Mientras EXPO_PUBLIC_USE_MOCKS sea "true" las peticiones se resuelven con el
 * mock local. Al apagar la bandera la misma llamada sale por axios hacia
 * NestJS sin tocar servicios ni pantallas.
 */
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { ErrorApi } from '../types/api';
import { mockRequest } from '../mocks';
import { obtenerToken } from './almacenamiento';

export const USAR_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS !== 'false';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const instancia = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

instancia.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* --- normalizacion de errores --- */

const MENSAJES: Record<number, string> = {
  400: 'Los datos enviados no son validos. Revisa el formulario.',
  401: 'Tu sesion expiro. Vuelve a iniciar sesion.',
  403: 'No tienes permisos para realizar esta accion.',
  404: 'No encontramos la informacion solicitada.',
  409: 'La operacion no se pudo completar por un conflicto con datos existentes.',
  422: 'Algunos datos no cumplen con lo requerido.',
  500: 'Ocurrio un problema en el servidor. Intenta nuevamente en unos minutos.',
};

function normalizarError(error: unknown): ErrorApi {
  if (error instanceof ErrorApi) return error;

  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string | string[] }>;
    const status = err.response?.status ?? 0;
    if (!err.response) {
      return new ErrorApi('No pudimos conectar con el servidor. Verifica tu conexion.', 0);
    }
    const detalle = err.response.data?.message;
    const mensaje =
      (Array.isArray(detalle) ? detalle[0] : detalle) ??
      MENSAJES[status] ??
      'No pudimos completar la operacion.';
    return new ErrorApi(mensaje, status);
  }

  return new ErrorApi('Ocurrio un error inesperado.', 0);
}

/* --- API publica --- */

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ParamsConsulta = Record<string, unknown>;

async function peticion<T>(
  metodo: Metodo,
  url: string,
  datos?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  try {
    if (USAR_MOCKS) {
      return await mockRequest<T>(metodo, url, datos, config?.params as ParamsConsulta);
    }
    const respuesta = await instancia.request<T>({ method: metodo, url, data: datos, ...config });
    return respuesta.data;
  } catch (error) {
    throw normalizarError(error);
  }
}

export const api = {
  get: <T>(url: string, params?: object) => peticion<T>('GET', url, undefined, { params }),
  post: <T>(url: string, datos?: unknown) => peticion<T>('POST', url, datos),
  put: <T>(url: string, datos?: unknown) => peticion<T>('PUT', url, datos),
  patch: <T>(url: string, datos?: unknown) => peticion<T>('PATCH', url, datos),
  delete: <T>(url: string) => peticion<T>('DELETE', url),
};
