import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReportesPage from '@/app/(dashboard)/reportes/page';

const { table, save, text } = vi.hoisted(() => ({ table: vi.fn(), save: vi.fn(), text: vi.fn() }));

vi.mock('@/lib/hooks/useAuthUser', () => ({
  useAuthUser: () => ({ user: { nombreFinca: 'Hacienda El Progreso' } }),
}));

vi.mock('@/lib/api/reproductivo', () => ({
  getProximosEventos: vi.fn(async () => []),
}));

vi.mock('@/lib/api/animales', () => ({
  getAnimales: vi.fn(async () => []),
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

const mockRetiros = [
  {
    animalId: 'animal-1',
    arete: '101',
    nombre: 'Lola',
    fechaLiberacionLeche: '2026-10-15',
    fechaLiberacionCarne: '2026-10-25',
    diasRestantesLeche: 7,
    diasRestantesCarne: 17,
  },
  {
    animalId: 'animal-2',
    arete: '102',
    nombre: 'Canela',
    fechaLiberacionLeche: null,
    fechaLiberacionCarne: '2026-10-10',
    diasRestantesLeche: null,
    diasRestantesCarne: 2,
  },
];

let retirosMockResponse = mockRetiros;

vi.mock('@/lib/api/sanitary', () => ({
  getRetirosActivos: vi.fn(async () => retirosMockResponse),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  retirosMockResponse = mockRetiros;
});

it('REPORT-T002 / SAN-T004: genera el PDF del reporte ejecutivo de retiros con datos, semáforo y marco legal', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReportesPage />
    </QueryClientProvider>,
  );

  const downloadBtn = await screen.findByRole('button', { name: /descargar reporte pdf retiros/i });
  expect(downloadBtn).toBeDefined();

  await waitFor(() => {
    expect(screen.getByText('Lola')).toBeDefined();
  });

  fireEvent.click(downloadBtn);

  expect(table).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      head: [['Animal', 'Restricción', 'Liberación Leche', 'Liberación Carne', 'Días Bloqueo', 'Estado']],
      body: expect.arrayContaining([
        expect.arrayContaining(['Lola (#101)', 'Ambos']),
        expect.arrayContaining(['Canela (#102)', 'Carne']),
      ]),
    }),
  );

  expect(save).toHaveBeenCalledWith(expect.stringMatching(/^Reporte_Retiros_Sanitarios_.*\.pdf$/));

  expect(text).toHaveBeenCalledWith(
    expect.stringMatching(/Reporte ejecutivo de retiros sanitarios activos/i),
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

it('REPORT-T002 Criterio 2: emite constancia técnica clara si existen cero animales en retiro', async () => {
  retirosMockResponse = [];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ReportesPage />
    </QueryClientProvider>,
  );

  const downloadBtn = await screen.findByRole('button', { name: /descargar reporte pdf retiros/i });
  await waitFor(() => {
    expect(screen.getByText(/Hato libre de retiros/i)).toBeDefined();
  });

  fireEvent.click(downloadBtn);

  expect(text).toHaveBeenCalledWith(
    expect.stringMatching(/Constancia Técnica: Cero \(0\) Animales en Retiro Sanitario/i),
    expect.any(Number),
    expect.any(Number),
  );

  expect(save).toHaveBeenCalledWith(expect.stringMatching(/^Reporte_Retiros_Sanitarios_.*\.pdf$/));
});
