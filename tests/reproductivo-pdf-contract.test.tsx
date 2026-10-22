import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReproductivoPage from '@/app/(dashboard)/reproductivo/page';

const { table, save, text } = vi.hoisted(() => ({ table: vi.fn(), save: vi.fn(), text: vi.fn() }));

vi.mock('@/lib/hooks/useAuthUser', () => ({
  useAuthUser: () => ({ user: { nombreFinca: 'Hacienda El Progreso' } }),
}));

vi.mock('jspdf', () => ({
  default: class {
    lastAutoTable = { finalY: 80 };
    setFontSize() {}
    setTextColor() {}
    text = text;
    addPage() {}
    save = save;
  },
}));

vi.mock('jspdf-autotable', () => ({ default: table }));

const mockEventos = [
  {
    animalId: 'animal-1',
    arete: '101',
    nombre: 'Paloma',
    tipo: 'Parto',
    fecha: '2026-10-26',
    diasRestantes: 12,
    urgente: false,
  },
  {
    animalId: 'animal-2',
    arete: '102',
    nombre: 'Canela',
    tipo: 'Aviso Parto Urgente',
    fecha: '2026-10-18',
    diasRestantes: 3,
    urgente: true,
  },
];

vi.mock('@/lib/api/client', () => ({
  fetchApi: vi.fn(async (endpoint: string) => {
    if (endpoint.startsWith('/reproductivo/proximos-eventos')) {
      return mockEventos;
    }
    return [];
  }),
}));

afterEach(cleanup);

it('REPORT-T002: genera el PDF de programación reproductiva con datos reales, horizonte y marco legal', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReproductivoPage />
    </QueryClientProvider>,
  );

  const downloadBtn = await screen.findByRole('button', { name: /descargar reporte pdf/i });
  expect(downloadBtn).toBeDefined();

  await waitFor(() => {
    expect(screen.getByText('Paloma')).toBeDefined();
  });

  fireEvent.click(downloadBtn);

  expect(table).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      head: [['Animal', 'Hito Reproductivo', 'Fecha Estimada', 'Días Restantes', 'Prioridad']],
      body: expect.arrayContaining([
        expect.arrayContaining(['Paloma (#101)', 'Parto FPP']),
        expect.arrayContaining(['Canela (#102)', 'Aviso Parto Urgente']),
      ]),
    }),
  );

  const ventana = screen.getByRole('combobox', { name: /ventana/i }) as HTMLSelectElement;
  expect(ventana.value).toBe('365');
  expect(screen.getByRole('option', { name: '365 días' })).toBeDefined();

  expect(save).toHaveBeenCalledWith(expect.stringMatching(/^Programacion_Reproductiva_365d_.*\.pdf$/));

  expect(text).toHaveBeenCalledWith(
    expect.stringMatching(/Programación Reproductiva y Partos Proyectados/i),
    expect.any(Number),
    expect.any(Number),
  );

  expect(text).toHaveBeenCalledWith(
    expect.stringMatching(/Finca: Hacienda El Progreso/i),
    expect.any(Number),
    expect.any(Number),
  );

  expect(text).toHaveBeenCalledWith(
    expect.stringMatching(/Documento técnico para control y gestión interna/i),
    expect.any(Number),
    expect.any(Number),
  );
});
