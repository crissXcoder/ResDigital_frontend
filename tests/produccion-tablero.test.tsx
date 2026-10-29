import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProduccionPage from '@/app/(dashboard)/produccion/page';
import { hoyLocal } from '@/lib/reproductivo/fechas';

const api = vi.hoisted(() => ({
  getAnimales: vi.fn(),
  getHembrasEnLactancia: vi.fn(),
  getProduccionRegistros: vi.fn(),
  getResumenProduccion: vi.fn(),
  getRetirosActivos: vi.fn(),
  createProduccionLeche: vi.fn(),
  updateProduccionLeche: vi.fn(),
}));
vi.mock('@/lib/api/animales', () => ({ getAnimales: api.getAnimales }));
vi.mock('@/lib/api/sanitary', () => ({ getRetirosActivos: api.getRetirosActivos }));
vi.mock('@/lib/api/produccion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/produccion')>()),
  getHembrasEnLactancia: api.getHembrasEnLactancia,
  getProduccionRegistros: api.getProduccionRegistros,
  getResumenProduccion: api.getResumenProduccion,
  createProduccionLeche: api.createProduccionLeche,
  updateProduccionLeche: api.updateProduccionLeche,
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

it('carga registros reales, permite captura en retiro y guarda el turno nuevo', async () => {
  const fecha = '2026-10-21';
  api.getAnimales.mockResolvedValue([
    { id: 'vaca-1', areteInterno: '101', nombre: 'Luna', sexo: 'Hembra', activo: true },
    { id: 'vaca-2', areteInterno: '102', nombre: 'Sol', sexo: 'Hembra', activo: true },
  ]);
  api.getHembrasEnLactancia.mockResolvedValue([
    { animalId: 'vaca-1' }, { animalId: 'vaca-2' },
  ]);
  api.getRetirosActivos.mockResolvedValue([{
    animalId: 'vaca-2', fechaLiberacionLeche: '2026-10-26',
    tratamientoReferencia: { fechaAplicacion: '2026-10-20' },
  }]);
  let guardado = false;
  api.getProduccionRegistros.mockImplementation(async (desde: string, hasta: string) => [
    ...(guardado ? [{ id: 'p-1', animalId: 'vaca-1', fecha, turno: 'MANANA', litros: 12,
      revertido: false, disposicion: 'COMERCIALIZABLE' }] : []),
    { id: 'p-old', animalId: 'vaca-1', fecha: '2026-10-10', turno: 'TARDE', litros: 5,
      revertido: false, disposicion: 'COMERCIALIZABLE' },
    { id: 'p-discard', animalId: 'vaca-2', fecha: '2026-10-20', turno: 'MANANA', litros: 4,
      revertido: false, disposicion: 'DESCARTE' },
  ].filter((r) => r.fecha >= desde && r.fecha <= hasta));
  api.getResumenProduccion.mockResolvedValue({ porFecha: [], litrosProducidos: 0 });
  api.createProduccionLeche.mockImplementation(async () => { guardado = true; return {}; });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProduccionPage /></QueryClientProvider>);

  fireEvent.change(screen.getByLabelText('Fecha de producción'), { target: { value: fecha } });
  expect(await screen.findByLabelText('Mañana 101')).toBeDefined();
  await waitFor(() => expect(api.getResumenProduccion).toHaveBeenCalledWith('2026-09-22', fecha));
  fireEvent.change(screen.getByLabelText('Período del gráfico, ranking e historial'), { target: { value: '7' } });
  await waitFor(() => expect(api.getResumenProduccion).toHaveBeenCalledWith('2026-10-15', fecha));
  fireEvent.change(screen.getByLabelText('Período del gráfico, ranking e historial'), { target: { value: 'personalizado' } });
  fireEvent.change(screen.getByLabelText('Histórico desde'), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText('Histórico hasta'), { target: { value: '2026-10-20' } });
  await waitFor(() => expect(api.getResumenProduccion).toHaveBeenCalledWith('2026-10-01', '2026-10-20'));
  expect(screen.getByText('Historial del período')).toBeDefined();
  expect(within(screen.getByRole('table', { name: 'Historial de producción' })).getByText('5.0 L')).toBeDefined();
  fireEvent.change(screen.getByLabelText('Filtrar vacas para registro'), { target: { value: 'todas' } });
  expect(screen.getByText('Descarte por retiro')).toBeDefined();
  expect(screen.getByLabelText('Mañana 102')).toBeDefined();
  fireEvent.change(screen.getByLabelText('Mañana 101'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: /guardar 1 ordeño/i }));

  await waitFor(() => expect(api.createProduccionLeche).toHaveBeenCalledWith({
    animalId: 'vaca-1', fecha, turno: 'MANANA', litros: 12,
  }));
  expect((await screen.findByRole('status')).textContent).toContain('1 ordeño(s) guardado(s)');
  expect(screen.queryByLabelText('Mañana 101')).toBeNull();
  expect(screen.getAllByText('12.0 L').length).toBeGreaterThan(0);
});

it('pagina de diez en diez y conserva ordeños pendientes entre páginas', async () => {
  const fecha = hoyLocal();
  const vacas = Array.from({ length: 12 }, (_, index) => ({
    id: `vaca-${index + 1}`, areteInterno: String(index + 1),
    nombre: `Vaca ${index + 1}`, sexo: 'Hembra', activo: true,
  }));
  api.getAnimales.mockResolvedValue(vacas);
  api.getHembrasEnLactancia.mockResolvedValue(vacas.map((vaca) => ({ animalId: vaca.id })));
  api.getRetirosActivos.mockResolvedValue([]);
  api.getProduccionRegistros.mockResolvedValue([]);
  api.getResumenProduccion.mockResolvedValue({ porFecha: [], litrosProducidos: 0 });
  api.createProduccionLeche.mockResolvedValue({});
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProduccionPage /></QueryClientProvider>);

  expect(await screen.findByLabelText('Mañana 1')).toBeDefined();
  expect(screen.getByText('Mostrando 1–10 de 12 vacas')).toBeDefined();
  expect(screen.queryByLabelText('Mañana 11')).toBeNull();
  fireEvent.change(screen.getByLabelText('Mañana 1'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByText('Mostrando 11–12 de 12 vacas')).toBeDefined();
  fireEvent.change(screen.getByLabelText('Mañana 11'), { target: { value: '4' } });
  expect(screen.getByRole('button', { name: /guardar 2 ordeño/i })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
  expect((screen.getByLabelText('Mañana 1') as HTMLInputElement).value).toBe('3');
  fireEvent.click(screen.getByRole('button', { name: /guardar 2 ordeño/i }));
  await waitFor(() => expect(api.createProduccionLeche).toHaveBeenCalledTimes(2));
  expect(api.createProduccionLeche).toHaveBeenCalledWith({ animalId: 'vaca-11', fecha, turno: 'MANANA', litros: 4 });
});

it('muestra el botón de Carga masiva (CSV) y abre el modal correspondiente', async () => {
  api.getAnimales.mockResolvedValue([]);
  api.getHembrasEnLactancia.mockResolvedValue([]);
  api.getRetirosActivos.mockResolvedValue([]);
  api.getProduccionRegistros.mockResolvedValue([]);
  api.getResumenProduccion.mockResolvedValue({ porFecha: [], litrosProducidos: 0 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProduccionPage /></QueryClientProvider>);

  const botonCarga = screen.getByRole('button', { name: /carga masiva \(csv\)/i });
  expect(botonCarga).toBeDefined();
  fireEvent.click(botonCarga);
  expect(await screen.findByText('Carga masiva de producción lechera')).toBeDefined();
});

it('permite editar directamente los litros de un registro ya guardado', async () => {
  const fecha = hoyLocal();
  api.getAnimales.mockResolvedValue([
    { id: 'vaca-1', areteInterno: '101', nombre: 'Luna', sexo: 'Hembra', activo: true },
  ]);
  api.getHembrasEnLactancia.mockResolvedValue([{ animalId: 'vaca-1' }]);
  api.getRetirosActivos.mockResolvedValue([]);
  api.getProduccionRegistros.mockResolvedValue([
    { id: 'p-1', animalId: 'vaca-1', fecha, turno: 'MANANA', litros: 6.8, revertido: false, disposicion: 'COMERCIALIZABLE' },
  ]);
  api.getResumenProduccion.mockResolvedValue({ porFecha: [], litrosProducidos: 6.8 });
  api.updateProduccionLeche.mockResolvedValue({ id: 'p-1', litros: 8.5 });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProduccionPage /></QueryClientProvider>);

  expect((await screen.findAllByText('6.8 L')).length).toBeGreaterThan(0);
  const botonEditar = screen.getByRole('button', { name: 'Modificar Mañana 101' });
  fireEvent.click(botonEditar);

  const inputEdicion = screen.getByLabelText('Editar Mañana 101') as HTMLInputElement;
  expect(inputEdicion.value).toBe('6.8');
  fireEvent.change(inputEdicion, { target: { value: '8.5' } });
  fireEvent.change(screen.getByLabelText('Motivo de corrección'), { target: { value: 'Error de digitación' } });

  const botonConfirmar = screen.getByRole('button', { name: 'Confirmar edición' });
  fireEvent.click(botonConfirmar);

  await waitFor(() => {
    expect(api.updateProduccionLeche).toHaveBeenCalledWith('p-1', { litros: 8.5, motivo: 'Error de digitación' });
  });
});
