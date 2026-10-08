import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExpedienteAnimal from '@/app/(dashboard)/hato/[id]/page';
import type { Animal } from '@/lib/api/animales';
import type { TratamientoSanitario } from '@/lib/api/sanitary';
import type { ProduccionLeche } from '@/lib/api/produccion';

const { table } = vi.hoisted(() => ({ table: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'animal-1' }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: {} }) }));
vi.mock('@/lib/hooks/useAuthUser', () => ({ useAuthUser: () => ({ user: null }) }));
vi.mock('@/components/auth/RequireRole', () => ({ RequireRole: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('jspdf', () => ({ default: class {
  lastAutoTable = { finalY: 80 };
  setFontSize() {} setTextColor() {} text() {} addPage() {}
  save = vi.fn();
} }));
vi.mock('jspdf-autotable', () => ({ default: table }));
vi.mock('@/lib/api/client', () => ({ fetchApi: vi.fn(async (endpoint: string) => {
  if (endpoint === '/animales/animal-1') return animal;
  if (endpoint.endsWith('/estado-sanitario')) return { enRetiro: true };
  if (endpoint === '/tratamientos/animal/animal-1') return [tratamiento];
  if (endpoint === '/produccion-leche/animal/animal-1') return produccion;
  if (endpoint === '/pesajes/animal/animal-1') return [{ id: 'w-1', animalId: 'animal-1', fecha: '2026-10-01', pesoActualKg: 480 }];
  return [];
}) }));

const animal: Animal = { id: 'animal-1', tenantId: 'test', nombre: 'Canela', areteInterno: '104',
  sexo: 'Hembra', razaId: 'raza', categoria: 'Vaca', activo: true };
const tratamiento = {
  id: 't-1', animalId: 'animal-1', fecha: '2026-10-01', fechaUltimaAdministracion: '2026-10-01',
  medicamentoId: null, farmaco: 'Oxitetraciclina', padecimientoId: null, diagnostico: 'Mastitis', dosis: '10 ml',
  via: null, veterinario: null, diasRetiroLeche: 5, diasRetiroCarne: 0, fechaLiberacionLeche: '2099-01-01',
  fechaLiberacionCarne: '2026-10-01', documentoUrl: null, usuarioId: 'u-1', eventoCorrigeId: null,
  fechaRegistro: '2026-10-01T10:00:00Z',
} satisfies TratamientoSanitario;
const produccion: ProduccionLeche[] = [{
  id: 'p-1', animalId: 'animal-1', fecha: '2026-10-02', turno: 'TARDE', litros: 7, disposicion: 'DESCARTE',
  tratamientoEventoId: 't-1', fechaLiberacionLeche: '2099-01-01', revertido: false, usuarioId: 'u-1', notas: null,
  fechaRegistro: '2026-10-02T18:00:00Z',
}];

afterEach(cleanup);

it('presenta el retiro de leche como descarte y el PDF separa pesajes de producción', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ExpedienteAnimal /></QueryClientProvider>);

  expect(await screen.findByText('Leche no comercializable (descarte)')).toBeDefined();
  expect(screen.queryByText(/Bloqueo de Ordeño/i)).toBeNull();

  await waitFor(() => expect(client.getQueryData(['produccionLeche', animal.id])).toEqual(produccion));
  await waitFor(() => expect(client.getQueryData(['pesajes', animal.id])).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: /descargar/i }));

  expect(table).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    head: [['Fecha', 'Peso (kg)']],
    body: [['01/10/2026', '480 kg']],
  }));
  expect(table).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    head: [['Fecha', 'Turno', 'Litros', 'Disposición']],
    body: [['02/10/2026', 'Tarde', '7.0 L', 'Descarte']],
  }));
});
