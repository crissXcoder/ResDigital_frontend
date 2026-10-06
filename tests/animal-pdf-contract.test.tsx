import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExpedienteAnimal from '@/app/(dashboard)/hato/[id]/page';
import type { Animal } from '@/lib/api/animales';
import type { EstadoReproductivoResponse } from '@/lib/reproductivo/tipos';

const { table, save } = vi.hoisted(() => ({ table: vi.fn(), save: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'animal-1' }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: {} }) }));
vi.mock('@/lib/hooks/useAuthUser', () => ({ useAuthUser: () => ({ user: null }) }));
vi.mock('@/components/auth/RequireRole', () => ({ RequireRole: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('jspdf', () => ({ default: class {
  lastAutoTable = { finalY: 80 };
  setFontSize() {} setTextColor() {} text() {} addPage() {}
  save = save;
} }));
vi.mock('jspdf-autotable', () => ({ default: table }));
vi.mock('@/lib/api/client', () => ({ fetchApi: vi.fn(async (endpoint: string) => {
  if (endpoint === '/animales/animal-1') return animal;
  if (endpoint.endsWith('/estado-reproductivo')) return reproductive;
  if (endpoint.endsWith('/estado-sanitario')) return { enRetiro: false };
  return [];
}) }));
const animal: Animal = { id: 'animal-1', tenantId: 'test', nombre: 'Canela', areteInterno: '104',
  sexo: 'Hembra', razaId: 'raza', categoria: 'Vaca', activo: true };
const reproductive: EstadoReproductivoResponse = {
  animalId: animal.id, areteInterno: animal.areteInterno, sexo: 'Hembra', estadoActual: 'Servida',
  servicioActivo: { eventoId: 'servicio-1', fechaServicio: '2026-09-10', tipoServicio: 'Monta Natural',
    toroOPajilla: 'Titan', fpp: '2027-06-20', palpacionFecha: '2026-10-20', secadoFecha: '2027-04-21',
    avisoPartoFecha: '2027-06-05', avisoPartoUrgenteFecha: '2027-06-17' },
};
afterEach(cleanup);
it('incluye la fechaServicio y toroOPajilla reales en el historial PDF', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ExpedienteAnimal /></QueryClientProvider>);
  const download = await screen.findByRole('button', { name: /descargar/i });
  await waitFor(() => expect(client.getQueryData(['estadoReproductivo', animal.id])).toEqual(reproductive));
  fireEvent.click(download);
  expect(table).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    head: [['Fecha', 'Tipo', 'Toro/Semen', 'Estado']],
    body: [['10/09/2026', 'Monta Natural', 'Titan', 'Pendiente']],
  }));
  expect(save).toHaveBeenCalledOnce();
});
