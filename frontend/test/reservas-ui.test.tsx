import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProveedorAuth } from '../src/context/AuthContext';
import { ProveedorToast } from '../src/context/ToastContext';
import PaginaNuevaReserva from '../src/features/reservations/PaginaNuevaReserva';
import PaginaMisReservas from '../src/features/reservations/PaginaMisReservas';
import PaginaReservasOperacion from '../src/features/reservations/PaginaReservasOperacion';
import { instancia } from '../src/api/http';
import { guardarToken } from '../src/api/sesion';
import { adaptarProducto } from '../src/api/catalogo.contratos';
import { prenda, pagina } from './catalogo-fixtures';
import { reserva } from './reservas-fixtures';
import { respuesta, rechazo, usuarioBackend } from './fixtures';
let root: Root;
let container: HTMLDivElement;
let qc: QueryClient;
beforeEach(() => {
  guardarToken('cliente');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
});
afterEach(async () => {
  await act(async () => root.unmount());
  qc.clear();
  container.remove();
});
async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
}
async function montar(e: ReactNode, ruta = '/') {
  await act(async () =>
    root.render(
      <QueryClientProvider client={qc}>
        <ProveedorAuth>
          <ProveedorToast>
            <MemoryRouter initialEntries={[ruta]}>{e}</MemoryRouter>
          </ProveedorToast>
        </ProveedorAuth>
      </QueryClientProvider>,
    ),
  );
  await esperar();
}
function botones(texto: string) {
  return [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === texto);
}
async function click(texto: string) {
  await act(async () => botones(texto)[0].click());
  await esperar();
}
async function select(id: string, valor: string) {
  await act(async () => {
    const e = document.getElementById(id) as HTMLSelectElement;
    e.value = valor;
    e.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function input(id: string, valor: string) {
  await act(async () => {
    const e = document.getElementById(id)!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(e, valor);
    e.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function catalogo() {
  qc.setQueryData(
    ['sucursales'],
    [{ id_sucursal: 2, nombre: 'Centro', ciudad: 'La Paz', activa: true }],
  );
  qc.setQueryData(['productos', { page: 1, page_size: 6 }], {
    items: [adaptarProducto(prenda), adaptarProducto({ ...prenda, id: 2, name: 'Blusa' })],
    total: 2,
    page: 1,
    page_size: 6,
  });
  for (const id of [1, 2]) {
    qc.setQueryData(
      ['producto', id],
      adaptarProducto({ ...prenda, id, name: id === 1 ? 'Camisa' : 'Blusa' }),
    );
    qc.setQueryData(
      ['disponibilidad', { id_producto: id, id_talla: 9, id_color: 10, id_sucursal: 2 }],
      [{ cantidad_disponible: 3 }],
    );
  }
}
async function agregar(nombre: string) {
  await click(nombre === 'Camisa' ? 'CamisaCamisas' : 'BlusaCamisas');
  await click('M');
  await click('Azul');
  await click('Agregar a la reserva');
}
describe('reservas en React', () => {
  it('crea varias prendas, valida horario y fija la sucursal mientras hay seleccion', async () => {
    catalogo();
    vi.spyOn(qc, 'invalidateQueries').mockResolvedValue();
    let envio: Record<string, unknown> | undefined;
    instancia.defaults.adapter = async (c) => {
      if (c.url === '/auth/me') return respuesta(c, usuarioBackend);
      envio = JSON.parse(c.data);
      return respuesta(c, reserva);
    };
    await montar(<PaginaNuevaReserva />);
    await select('sucursal-reserva', '2');
    await agregar('Camisa');
    expect((document.getElementById('sucursal-reserva') as HTMLSelectElement).disabled).toBe(true);
    await agregar('Blusa');
    await input('horario', '2000-01-01T12:00');
    await click('Confirmar reserva');
    expect(document.body.textContent).toContain('fecha y hora futura');
    expect(envio).toBeUndefined();
    await input('horario', '2100-09-12T14:00');
    await click('Confirmar reserva');
    expect(envio).toMatchObject({
      branchId: 2,
      approximateTime: new Date('2100-09-12T14:00').toISOString(),
      items: [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 1 },
      ],
    });
  });
  it('no representa un fallo de disponibilidad como stock cero ni permite agregar', async () => {
    catalogo();
    qc.removeQueries({ queryKey: ['disponibilidad'] });
    instancia.defaults.adapter = async (c) => {
      if (c.url === '/auth/me') return respuesta(c, usuarioBackend);
      throw rechazo(c, 503, 'Stock temporalmente no disponible');
    };
    await montar(<PaginaNuevaReserva />);
    await select('sucursal-reserva', '2');
    await click('CamisaCamisas');
    await click('M');
    await click('Azul');
    await esperar();
    expect(document.body.textContent).toContain('Stock temporalmente no disponible');
    expect(botones('Agregar a la reserva')[0].disabled).toBe(true);
  });
  it('mis reservas usa mine incluso con cuenta cliente/administrador, pagina y no cancela cliente presente', async () => {
    const paginas: number[] = [];
    instancia.defaults.adapter = async (c) => {
      if (c.url === '/auth/me')
        return respuesta(c, {
          ...usuarioBackend,
          roles: [
            ...usuarioBackend.roles,
            { role: { id: 1, name: 'ADMINISTRATOR', description: null } },
          ],
        });
      expect(c.url).toBe('/reservations/mine');
      paginas.push(c.params.page);
      return respuesta(
        c,
        pagina(
          [reserva, { ...reserva, id: 60, status: 'CUSTOMER_PRESENT' }],
          c.params.page,
          10,
          12,
        ),
      );
    };
    await montar(<PaginaMisReservas />);
    expect(botones('Cancelar reserva')).toHaveLength(1);
    const siguiente = [...document.querySelectorAll('button')].find(
      (b) =>
        b.getAttribute('aria-label')?.includes('iguiente') || b.textContent?.includes('Siguiente'),
    )!;
    await act(async () => siguiente.click());
    await esperar();
    expect(paginas).toContain(2);
  });
  it('un 409 por vencimiento refresca reservas, stock y carrito', async () => {
    let vencida = false;
    instancia.defaults.adapter = async (c) => {
      if (c.url === '/auth/me') return respuesta(c, usuarioBackend);
      if (c.method === 'patch') {
        vencida = true;
        throw rechazo(c, 409, 'The reservation expired and its stock was released');
      }
      return respuesta(c, pagina([{ ...reserva, status: vencida ? 'EXPIRED' : 'PENDING' }], 1, 10));
    };
    const invalidar = vi.spyOn(qc, 'invalidateQueries');
    await montar(<PaginaMisReservas />);
    await click('Cancelar reserva');
    await click('Si, cancelar');
    expect(document.body.textContent).toContain('Vencida');
    expect(botones('Cancelar reserva')).toHaveLength(0);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['carrito'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['disponibilidad'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['reserva'] });
  });
  it('la sucursal sigue las transiciones y distingue cerrar atencion de registrar una compra', async () => {
    let estado = 'READY';
    qc.setQueryData(['sucursales'], []);
    instancia.defaults.adapter = async (c) => {
      if (c.url === '/auth/me')
        return respuesta(c, {
          ...usuarioBackend,
          roles: [{ role: { id: 1, name: 'ADMINISTRATOR', description: null } }],
        });
      if (c.method === 'patch') {
        estado = JSON.parse(c.data).status;
        expect(c.url).toBe('/reservations/50/status');
        return respuesta(c, { ...reserva, status: estado });
      }
      return respuesta(c, pagina([{ ...reserva, status: estado }], 1, 30));
    };
    await montar(<PaginaReservasOperacion />);
    expect(botones('Marcar vencida')).toHaveLength(0);
    expect(botones('Cancelar')).toHaveLength(1);
    await click('Cliente en tienda');
    await click('Actualizar');
    expect(estado).toBe('CUSTOMER_PRESENT');
    await click('Cerrar atencion');
    expect(document.body.textContent).toContain('no registra una venta ni un pago');
    await click('Actualizar');
    expect(estado).toBe('COMPLETED');
    expect(botones('Cerrar atencion')).toHaveLength(0);
  });
  it('no mezcla una reserva ajena destacada con el listado propio de una cuenta con varios roles', async () => {
    instancia.defaults.adapter = async (c) => {
      if (c.url === '/auth/me') return respuesta(c, { ...usuarioBackend, roles: [...usuarioBackend.roles, { role: { id: 1, name: 'ADMINISTRATOR', description: null } }] });
      if (c.url === '/reservations/mine') return respuesta(c, pagina([], 1, 10));
      expect(c.url).toBe('/reservations/50'); return respuesta(c, { ...reserva, clientId: 99, client: { ...reserva.client, id: 99 } });
    };
    await montar(<PaginaMisReservas />, '/mis-reservas?destacada=50');
    expect(document.body.textContent).not.toContain('Reserva #50');
    expect(botones('Cancelar reserva')).toHaveLength(0);
  });

});
