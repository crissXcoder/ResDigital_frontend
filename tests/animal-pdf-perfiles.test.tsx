import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExpedienteAnimal from '@/app/(dashboard)/hato/[id]/page';
import { ApiError } from '@/lib/api/client';
import type { Animal } from '@/lib/api/animales';
import type { EstadoReproductivoResponse } from '@/lib/reproductivo/tipos';

const { table, save, text, perfil, fetchApi } = vi.hoisted(() => ({
  table: vi.fn(),
  save: vi.fn(),
  text: vi.fn(),
  perfil: { animal: null as unknown, reproductivo: null as unknown },
  fetchApi: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'animal-1' }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: {} }) }));
vi.mock('@/lib/hooks/useAuthUser', () => ({ useAuthUser: () => ({ user: null }) }));
vi.mock('@/components/auth/RequireRole', () => ({ RequireRole: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('jspdf', () => ({ default: class {
  lastAutoTable = { finalY: 80 };
  setFontSize() {} setTextColor() {} addPage() {}
  text = text;
  save = save;
} }));
vi.mock('jspdf-autotable', () => ({ default: table }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, fetchApi };
});

const base: Animal = { id: 'animal-1', tenantId: 'test', nombre: 'Canela', areteInterno: '104',
  sexo: 'Hembra', razaId: 'raza', categoria: 'Vaca', activo: true };

const gestante: EstadoReproductivoResponse = {
  animalId: base.id, areteInterno: base.areteInterno, sexo: 'Hembra', estadoActual: 'Preñada',
  proximosHitos: [], advertencias: [],
  servicioActivo: { eventoId: 'servicio-1', fechaServicio: '2026-05-10', tipoServicio: 'Inseminación Artificial',
    toroOPajilla: 'Pajilla 77', responsable: null, fpp: '2027-02-15', palpacionFecha: '2026-06-20', secadoFecha: '2026-12-17',
    avisoPartoFecha: '2027-01-31', avisoPartoUrgenteFecha: '2027-02-12', notas: null },
  ultimoDiagnostico: { eventoId: 'diag-1', fecha: '2026-06-20', metodo: 'Palpación', resultado: 'Preñada',
    eventoServicioId: 'servicio-1' },
};

const sinServicio = (sexo: string): EstadoReproductivoResponse => ({
  animalId: base.id, areteInterno: base.areteInterno, sexo, estadoActual: 'Vacía',
  proximosHitos: [], advertencias: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchApi.mockImplementation(async (endpoint: string) => {
    if (endpoint === '/animales/animal-1') return perfil.animal;
    if (endpoint.endsWith('/estado-reproductivo')) {
      if (perfil.reproductivo instanceof Error) throw perfil.reproductivo;
      return perfil.reproductivo;
    }
    if (endpoint.endsWith('/estado-sanitario')) return { enRetiro: false };
    return [];
  });
});
afterEach(cleanup);

async function descargarPdf() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ExpedienteAnimal /></QueryClientProvider>);
  const boton = await screen.findByRole('button', { name: /descargar/i });
  await waitFor(() => expect(client.getQueryState(['estadoReproductivo', base.id])?.status).not.toBe('pending'));
  await waitFor(() => expect(client.getQueryState(['tratamientos', base.id])?.status).toBe('success'));
  fireEvent.click(boton);
  expect(save).toHaveBeenCalledOnce();
  return text.mock.calls.map(([t]) => String(t));
}

describe('PDF del expediente según el perfil del animal', () => {
  it('animal sin historial: todas las secciones dicen "Sin registros" y no hay tablas', async () => {
    perfil.animal = base;
    perfil.reproductivo = sinServicio('Hembra');

    const textos = await descargarPdf();

    expect(table).not.toHaveBeenCalled();
    for (const seccion of ['Historial de Pesajes', 'Historial de Producción de Leche', 'Historial Sanitario', 'Historial Reproductivo']) {
      expect(textos).toContain(seccion);
    }
    expect(textos.filter((t) => t === 'Sin registros')).toHaveLength(4);
  });

  it('hembra gestante: el historial reproductivo muestra el servicio y el diagnóstico Preñada', async () => {
    perfil.animal = base;
    perfil.reproductivo = gestante;

    const textos = await descargarPdf();

    expect(textos).toContain('Sexo: Hembra');
    expect(table).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      head: [['Fecha', 'Tipo', 'Toro/Semen', 'Estado']],
      body: [['10/05/2026', 'Inseminación Artificial', 'Pajilla 77', 'Preñada']],
    }));
  });

  it('macho: no incluye producción de leche ni la consulta, y el PDF se genera igual', async () => {
    perfil.animal = { ...base, nombre: 'Titan', sexo: 'Macho', categoria: 'Toro' };
    perfil.reproductivo = new ApiError('El animal es de sexo Macho', 400);

    const textos = await descargarPdf();

    expect(textos).toContain('Sexo: Macho');
    expect(textos).not.toContain('Historial de Producción de Leche');
    expect(fetchApi).not.toHaveBeenCalledWith('/produccion-leche/animal/animal-1');
    expect(textos).toContain('Historial Reproductivo');
    expect(textos.filter((t) => t === 'Sin registros')).toHaveLength(3);
  });
});
