import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModalProduccionLeche from '@/components/modals/ModalProduccionLeche';
import TabProduccion from '@/components/produccion/TabProduccion';
import * as useAuthUserModule from '@/lib/hooks/useAuthUser';
import type { RolUsuario } from '@/lib/hooks/useAuthUser';
import {
  agruparProduccionPorFecha,
  toCreatePesajePayload,
  toCreateProduccionPayload,
  type EstadoLactancia,
  type ProduccionLeche,
} from '@/lib/api/produccion';
import type { EstadoSanitario } from '@/lib/api/sanitary';

const api = vi.hoisted(() => ({
  lactancia: null as unknown,
  sanitario: null as unknown,
  produccion: [] as unknown[],
}));

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: {} }) }));
vi.mock('@/lib/hooks/useAuthUser', () => ({ useAuthUser: vi.fn() }));
vi.mock('@/lib/api/client', () => ({
  fetchApi: vi.fn(async (endpoint: string) => {
    if (endpoint.startsWith('/lactancia/animal/')) return api.lactancia;
    if (endpoint.includes('/estado-sanitario')) return api.sanitario;
    if (endpoint.startsWith('/produccion-leche/animal/')) return api.produccion;
    return [];
  }),
}));

const ANIMAL = '11111111-1111-4111-8111-111111111111';

function lactancia(enLactancia: boolean): EstadoLactancia {
  return {
    animalId: ANIMAL,
    enLactancia,
    fechaInicio: enLactancia ? '2026-08-01' : null,
    eventoInicioId: null,
    fechaReferencia: '2026-10-06',
  };
}

const SIN_RETIRO: EstadoSanitario = {
  animalId: ANIMAL,
  enRetiro: false,
  liberacionLeche: null,
  liberacionCarne: null,
  diasRestantesLeche: 0,
  diasRestantesCarne: 0,
  tratamientoReferencia: null,
};

function registro(parcial: Partial<ProduccionLeche>): ProduccionLeche {
  return {
    id: 'p-1',
    animalId: ANIMAL,
    fecha: '2026-10-01',
    turno: 'MANANA',
    litros: 10,
    disposicion: 'COMERCIALIZABLE',
    tratamientoEventoId: null,
    fechaLiberacionLeche: null,
    revertido: false,
    usuarioId: 'u-1',
    notas: null,
    fechaRegistro: '2026-10-01T10:00:00Z',
    ...parcial,
  };
}

function comoRol(rol: RolUsuario) {
  vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
    user: { userId: '1', tenantId: '1', rol, nombreCompleto: 'Usuario', correo: 'u@finca.cr', nombreFinca: 'Finca' },
    role: rol,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isAuthenticated: true,
  });
}

function conQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  api.lactancia = lactancia(true);
  api.sanitario = SIN_RETIRO;
  api.produccion = [];
  comoRol('propietario');
});
afterEach(cleanup);

describe('payloads de producción y pesaje', () => {
  it('el pesaje solo envía animal, fecha y peso', () => {
    expect(toCreatePesajePayload({ animalId: ANIMAL, fecha: '2026-10-02', pesoActualKg: '480.25' })).toEqual({
      animalId: ANIMAL,
      fecha: '2026-10-02',
      pesoActualKg: 480.3,
    });
  });

  it('la producción no envía disposición y redondea litros a un decimal', () => {
    const payload = toCreateProduccionPayload({ animalId: ANIMAL, fecha: '2026-10-02', turno: 'TARDE', litros: '12.34', notas: '  ' });
    expect(payload).toEqual({ animalId: ANIMAL, fecha: '2026-10-02', turno: 'TARDE', litros: 12.3 });
    expect(payload).not.toHaveProperty('disposicion');
  });

  it('agrupa por fecha separando producido y comercializable, sin anulados', () => {
    expect(
      agruparProduccionPorFecha([
        registro({ id: 'a', fecha: '2026-10-02', litros: 8 }),
        registro({ id: 'b', fecha: '2026-10-01', turno: 'TARDE', litros: 5, disposicion: 'DESCARTE' }),
        registro({ id: 'c', fecha: '2026-10-01', litros: 10 }),
        registro({ id: 'd', fecha: '2026-10-01', litros: 99, revertido: true }),
      ]),
    ).toEqual([
      { fecha: '2026-10-01', producidos: 15, comercializables: 10 },
      { fecha: '2026-10-02', producidos: 8, comercializables: 8 },
    ]);
  });
});

describe('ModalProduccionLeche', () => {
  it('bloquea el registro si la hembra no está en lactancia', async () => {
    api.lactancia = lactancia(false);
    const onSubmit = vi.fn();
    conQuery(<ModalProduccionLeche isOpen onClose={vi.fn()} animalId={ANIMAL} onSubmit={onSubmit} />);

    expect(await screen.findByText(/no está en lactancia/i)).toBeDefined();
    const guardar = screen.getByRole('button', { name: /guardar producción/i }) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);
    fireEvent.click(guardar);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('advierte que la producción será descarte durante el retiro de leche', async () => {
    api.sanitario = {
      ...SIN_RETIRO,
      enRetiro: true,
      liberacionLeche: '2099-01-01',
      diasRestantesLeche: 5,
      tratamientoReferencia: { id: 't-1', farmaco: 'Oxitetraciclina', fechaAplicacion: '2000-01-01' },
    };
    conQuery(<ModalProduccionLeche isOpen onClose={vi.fn()} animalId={ANIMAL} onSubmit={vi.fn()} />);

    expect(await screen.findByText(/se registrará como descarte/i)).toBeDefined();
    expect(screen.getByText(/Oxitetraciclina/)).toBeDefined();
  });

  it('envía el payload exacto y cierra tras guardar', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    conQuery(<ModalProduccionLeche isOpen onClose={onClose} animalId={ANIMAL} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-02' } });
    fireEvent.change(screen.getByLabelText('Turno'), { target: { value: 'TARDE' } });
    fireEvent.change(screen.getByLabelText('Litros'), { target: { value: '11.5' } });
    const guardar = screen.getByRole('button', { name: /guardar producción/i }) as HTMLButtonElement;
    await waitFor(() => expect(guardar.disabled).toBe(false));
    fireEvent.click(guardar);

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith({ animalId: ANIMAL, fecha: '2026-10-02', turno: 'TARDE', litros: 11.5 });
  });

  it('muestra el 409 de turno duplicado y no cierra', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Ya existe producción del turno MANANA para esa fecha'));
    const onClose = vi.fn();
    conQuery(<ModalProduccionLeche isOpen onClose={onClose} animalId={ANIMAL} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Litros'), { target: { value: '9' } });
    const guardar = screen.getByRole('button', { name: /guardar producción/i }) as HTMLButtonElement;
    await waitFor(() => expect(guardar.disabled).toBe(false));
    fireEvent.click(guardar);

    expect((await screen.findByRole('alert')).textContent).toContain('Ya existe producción del turno');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('TabProduccion por rol y estado de lactancia', () => {
  const props = { animalId: ANIMAL, isMacho: false, pesajes: [], onRegistrarPesaje: vi.fn() };

  it('peón registra producción pero no gestiona lactancia ni anula', async () => {
    comoRol('peon');
    api.produccion = [registro({})];
    conQuery(<TabProduccion {...props} />);

    expect(await screen.findByRole('button', { name: 'Registrar Producción' })).toBeDefined();
    await screen.findByTestId('produccion-p-1');
    expect(screen.queryByRole('button', { name: /finalizar lactancia/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Anular producción' })).toBeNull();
  });

  it.each<RolUsuario>(['propietario', 'administrador'])('%s finaliza lactancia y anula producción', async (rol) => {
    comoRol(rol);
    api.produccion = [registro({}), registro({ id: 'p-2', revertido: true })];
    conQuery(<TabProduccion {...props} />);

    expect(await screen.findByRole('button', { name: 'Finalizar lactancia' })).toBeDefined();
    await screen.findByTestId('produccion-p-2');
    expect(screen.getAllByRole('button', { name: 'Anular producción' })).toHaveLength(1);
    expect(screen.getByTestId('produccion-p-2').className).toContain('line-through');
  });

  it('sin lactancia no ofrece registrar producción y permite iniciarla', async () => {
    api.lactancia = lactancia(false);
    conQuery(<TabProduccion {...props} />);

    expect(await screen.findByRole('button', { name: 'Iniciar lactancia' })).toBeDefined();
    expect(screen.getByTestId('estado-lactancia').textContent).toBe('No lactante');
    expect(screen.queryByRole('button', { name: 'Registrar Producción' })).toBeNull();
  });

  it('un macho solo ve pesajes', () => {
    conQuery(<TabProduccion {...props} isMacho />);

    expect(screen.getByText('Historial de Pesajes')).toBeDefined();
    expect(screen.queryByText('Historial de Producción de Leche')).toBeNull();
    expect(screen.queryByTestId('estado-lactancia')).toBeNull();
  });
});
