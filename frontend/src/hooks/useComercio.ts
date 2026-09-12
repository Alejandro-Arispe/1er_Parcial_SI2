import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  carritoService,
  reservasService,
  ventasService,
  type DatosReserva,
  type DatosVenta,
  type FiltrosReserva,
  type FiltrosVenta,
  type LineaSeleccion,
} from '../services/comercio.service';
import { totalLineas } from '../lib/domain';
import type { EstadoReserva } from '../types/domain';
import { claves } from './claves';

/* ---------------- carrito ---------------- */

export function useCarrito() {
  const { esCliente, autenticado } = useAuth();
  const consulta = useQuery({
    queryKey: claves.carrito,
    queryFn: carritoService.obtener,
    enabled: autenticado && esCliente,
    staleTime: 30 * 1000,
  });

  const detalles = consulta.data?.detalles ?? [];
  return {
    ...consulta,
    detalles,
    unidades: detalles.reduce((acc, d) => acc + d.cantidad, 0),
    total: totalLineas(detalles),
  };
}

export function useAgregarAlCarrito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linea: LineaSeleccion) => carritoService.agregar(linea),
    onSuccess: (carrito) => qc.setQueryData(claves.carrito, carrito),
  });
}

export function useCambiarCantidadCarrito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cantidad }: { id: number; cantidad: number }) =>
      carritoService.cambiarCantidad(id, cantidad),
    onSuccess: (carrito) => qc.setQueryData(claves.carrito, carrito),
  });
}

export function useQuitarDelCarrito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => carritoService.quitar(id),
    onSuccess: (carrito) => qc.setQueryData(claves.carrito, carrito),
  });
}

export function useVaciarCarrito() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => carritoService.vaciar(),
    onSuccess: (carrito) => qc.setQueryData(claves.carrito, carrito),
  });
}

/* ---------------- reservas ---------------- */

export function useReservas(filtros: FiltrosReserva = {}, habilitado = true) {
  return useQuery({
    queryKey: claves.reservas(filtros),
    queryFn: () => reservasService.listar(filtros),
    enabled: habilitado,
  });
}

export function useReserva(id: number | undefined) {
  return useQuery({
    queryKey: claves.reserva(id ?? 0),
    queryFn: () => reservasService.obtener(id!),
    enabled: Boolean(id),
  });
}

export function useCrearReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosReserva) => reservasService.crear(datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas'] });
      qc.invalidateQueries({ queryKey: ['inventario'] });
      qc.invalidateQueries({ queryKey: ['disponibilidad'] });
    },
  });
}

export function useCambiarEstadoReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoReserva }) =>
      reservasService.cambiarEstado(id, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas'] });
      qc.invalidateQueries({ queryKey: ['inventario'] });
    },
  });
}

export function useCancelarReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reservasService.cancelar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas'] });
      qc.invalidateQueries({ queryKey: ['inventario'] });
    },
  });
}

/* ---------------- ventas ---------------- */

export function useVentas(filtros: FiltrosVenta = {}, habilitado = true) {
  return useQuery({
    queryKey: claves.ventas(filtros),
    queryFn: () => ventasService.listar(filtros),
    enabled: habilitado,
  });
}

export function useVenta(id: number | undefined) {
  return useQuery({
    queryKey: claves.venta(id ?? 0),
    queryFn: () => ventasService.obtener(id!),
    enabled: Boolean(id),
  });
}

export function useRegistrarVenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosVenta) => ventasService.registrar(datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] });
      qc.invalidateQueries({ queryKey: ['inventario'] });
      qc.invalidateQueries({ queryKey: ['reportes'] });
      qc.invalidateQueries({ queryKey: claves.carrito });
    },
  });
}
