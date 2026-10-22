import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProduccionPage from '@/app/(dashboard)/produccion/page';

const api = vi.hoisted(() => ({
  getAnimales: vi.fn(),
  getHembrasEnLactancia: vi.fn(),
  getProduccionByAnimal: vi.fn(),
  getResumenProduccion: vi.fn(),
  getEstadoSanitario: vi.fn(),
  createProduccionLeche: vi.fn(),
}));
vi.mock('@/lib/api/animales', () => ({ getAnimales: api.getAnimales }));
vi.mock('@/lib/api/sanitary', () => ({ getEstadoSanitario: api.getEstadoSanitario }));
vi.mock('@/lib/api/produccion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/produccion')>()),
  getHembrasEnLactancia: api.getHembrasEnLactancia,
  getProduccionByAnimal: api.getProduccionByAnimal,
  getResumenProduccion: api.getResumenProduccion,
  createProduccionLeche: api.createProduccionLeche,
}));
vi.mock('@/components/auth/RequireRole', () => ({
  RequireRole: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('carga registros reales, bloquea retiro y guarda el turno nuevo', async () => {
  const fecha = '2026-10-21';
  api.getAnimales.mockResolvedValue([
    { id: 'vaca-1', areteInterno: '101', nombre: 'Luna', sexo: 'Hembra', activo: true },
    { id: 'vaca-2', areteInterno: '102', nombre: 'Sol', sexo: 'Hembra', activo: true },
  ]);
  api.getHembrasEnLactancia.mockResolvedValue([
    { animalId: 'vaca-1' }, { animalId: 'vaca-2' },
  ]);
  api.getEstadoSanitario.mockImplementation(async (id: string) => ({
    liberacionLeche: id === 'vaca-2' ? '2026-10-26' : null,
    tratamientoReferencia: id === 'vaca-2' ? { fechaAplicacion: '2026-10-20' } : null,
  }));
  let guardado = false;
  api.getProduccionByAnimal.mockImplementation(async (id: string) =>
    id === 'vaca-1' && guardado ? [{
      id: 'p-1', fecha, turno: 'MANANA', litros: 12, revertido: false,
      disposicion: 'COMERCIALIZABLE',
    }] : []);
  api.getResumenProduccion.mockResolvedValue({ porFecha: [], litrosProducidos: 0 });
  api.createProduccionLeche.mockImplementation(async () => { guardado = true; return {}; });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProduccionPage /></QueryClientProvider>);

  fireEvent.change(screen.getByLabelText('Fecha de producción'), { target: { value: fecha } });
  expect(await screen.findByLabelText('Mañana 101')).toBeDefined();
  await waitFor(() => expect(api.getResumenProduccion).toHaveBeenCalledWith('2026-09-22', fecha));
  fireEvent.change(screen.getByLabelText('Período del gráfico y ranking'), { target: { value: '7' } });
  await waitFor(() => expect(api.getResumenProduccion).toHaveBeenCalledWith('2026-10-15', fecha));
  fireEvent.change(screen.getByLabelText('Período del gráfico y ranking'), { target: { value: 'personalizado' } });
  fireEvent.change(screen.getByLabelText('Histórico desde'), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText('Histórico hasta'), { target: { value: '2026-10-20' } });
  await waitFor(() => expect(api.getResumenProduccion).toHaveBeenCalledWith('2026-10-01', '2026-10-20'));
  expect(screen.queryByLabelText('Mañana 102')).toBeNull();
  expect(screen.getByText('BLOQUEADA')).toBeDefined();
  fireEvent.change(screen.getByLabelText('Mañana 101'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: /guardar producción del día/i }));

  await waitFor(() => expect(api.createProduccionLeche).toHaveBeenCalledWith({
    animalId: 'vaca-1', fecha, turno: 'MANANA', litros: 12,
  }));
  expect((await screen.findByRole('status')).textContent).toContain('1 ordeño(s) guardado(s)');
  expect(screen.queryByLabelText('Mañana 101')).toBeNull();
  expect(screen.getAllByText('12.0 L').length).toBeGreaterThan(0);
});
