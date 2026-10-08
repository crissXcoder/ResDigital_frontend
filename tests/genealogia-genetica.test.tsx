import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExpedienteAnimal from '@/app/(dashboard)/hato/[id]/page';
import * as animalesApi from '@/lib/api/animales';
import * as sanitaryApi from '@/lib/api/sanitary';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'animal-f1-uuid' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/hooks/useAuthUser', () => ({
  useAuthUser: () => ({
    user: { id: 'usr-1', rol: 'propietario', tenantId: 'tenant-1' },
    loading: false,
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://storage/doc.pdf' }, error: null }),
      }),
    },
  }),
}));

describe('HATO-T006 — Genealogía y Composición Genética en Expediente (Frontend)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockAnimalF1: animalesApi.Animal = {
    id: 'animal-f1-uuid',
    tenantId: 'tenant-1',
    areteInterno: '701',
    nombre: 'Princesa F1',
    sexo: 'Hembra',
    categoria: 'Novilla',
    razaId: 'raza-h',
    raza: { id: 'raza-h', nombre: 'Holstein', dias_gestacion: 281 },
    activo: true,
    madreId: 'madre-uuid',
    madre: {
      id: 'madre-uuid',
      tenantId: 'tenant-1',
      areteInterno: '101',
      nombre: 'Mariposa',
      sexo: 'Hembra',
      categoria: 'Vaca',
      razaId: 'raza-h',
      activo: true,
    },
    padreId: undefined,
    padreExternoDescripcion: 'Pajilla Semex 29HO18900',
    origen: 'Finca',
  };

  const mockEstadoSanitario: sanitaryApi.EstadoSanitario = {
    animalId: 'animal-f1-uuid',
    enRetiro: false,
    liberacionLeche: null,
    liberacionCarne: null,
    diasRestantesLeche: 0,
    diasRestantesCarne: 0,
    tratamientoReferencia: null,
  };

  const mockComposicionF1: animalesApi.ComposicionGenetica = {
    animalId: 'animal-f1-uuid',
    areteInterno: '701',
    metodo: 'PROMEDIO_PROGENITORES',
    progenitoresAnalizados: {
      madreId: 'madre-uuid',
      padreId: null,
      padreExternoDescripcion: 'Pajilla Semex 29HO18900',
    },
    composicion: [
      { razaId: 'raza-h', nombre: 'Holstein', porcentaje: 50 },
      { razaId: 'raza-b', nombre: 'Brahman', porcentaje: 50 },
    ],
  };

  const mockCriasList: animalesApi.Animal[] = [
    {
      id: 'cria-1',
      tenantId: 'tenant-1',
      areteInterno: 'CR01',
      nombre: 'Lucero',
      sexo: 'Macho',
      categoria: 'Ternero',
      razaId: 'raza-h',
      raza: { id: 'raza-h', nombre: 'Holstein', dias_gestacion: 281 },
      fechaNacimiento: '2026-05-10',
      activo: true,
    },
    {
      id: 'cria-2',
      tenantId: 'tenant-1',
      areteInterno: 'CR02',
      nombre: 'Estrella',
      sexo: 'Hembra',
      categoria: 'Ternera',
      razaId: 'raza-h',
      fechaNacimiento: '2026-09-01',
      activo: true,
    },
  ];

  it('despliega los datos de padre externo y madre en el árbol genealógico', async () => {
    vi.spyOn(animalesApi, 'getAnimal').mockResolvedValue(mockAnimalF1);
    vi.spyOn(animalesApi, 'getPesajesByAnimal').mockResolvedValue([]);
    vi.spyOn(animalesApi, 'getTratamientosByAnimal').mockResolvedValue([]);
    vi.spyOn(animalesApi, 'getDocumentos').mockResolvedValue([]);
    vi.spyOn(animalesApi, 'getComposicionGenetica').mockResolvedValue(mockComposicionF1);
    vi.spyOn(animalesApi, 'getCriasByAnimal').mockResolvedValue(mockCriasList);
    vi.spyOn(sanitaryApi, 'getEstadoSanitario').mockResolvedValue(mockEstadoSanitario);

    render(
      <QueryClientProvider client={queryClient}>
        <ExpedienteAnimal />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Pajilla \/ Externo: Pajilla Semex 29HO18900/i)).toBeDefined();
      expect(screen.getByText(/Matriz #101 Mariposa/i)).toBeDefined();
    });
  });

  it('despliega la barra y badges de composición genética calculada con el método zootécnico correspondiente', async () => {
    vi.spyOn(animalesApi, 'getAnimal').mockResolvedValue(mockAnimalF1);
    vi.spyOn(animalesApi, 'getPesajesByAnimal').mockResolvedValue([]);
    vi.spyOn(animalesApi, 'getTratamientosByAnimal').mockResolvedValue([]);
    vi.spyOn(animalesApi, 'getDocumentos').mockResolvedValue([]);
    vi.spyOn(animalesApi, 'getComposicionGenetica').mockResolvedValue(mockComposicionF1);
    vi.spyOn(animalesApi, 'getCriasByAnimal').mockResolvedValue(mockCriasList);
    vi.spyOn(sanitaryApi, 'getEstadoSanitario').mockResolvedValue(mockEstadoSanitario);

    render(
      <QueryClientProvider client={queryClient}>
        <ExpedienteAnimal />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Composición Genética Ponderada/i)).toBeDefined();
      expect(screen.getByText(/Promedio de Progenitores/i)).toBeDefined();
      expect(screen.getByText(/Holstein:/i)).toBeDefined();
      expect(screen.getByText(/Brahman:/i)).toBeDefined();
    });
  });

  it('despliega las crías reales registradas sin mostrar contador mock en 0', async () => {
    vi.spyOn(animalesApi, 'getAnimal').mockResolvedValue(mockAnimalF1);
    vi.spyOn(animalesApi, 'getPesajesByAnimal').mockResolvedValue([]);
    vi.spyOn(animalesApi, 'getTratamientosByAnimal').mockResolvedValue([]);
    vi.spyOn(animalesApi, 'getDocumentos').mockResolvedValue([]);
    vi.spyOn(animalesApi, 'getComposicionGenetica').mockResolvedValue(mockComposicionF1);
    vi.spyOn(animalesApi, 'getCriasByAnimal').mockResolvedValue(mockCriasList);
    vi.spyOn(sanitaryApi, 'getEstadoSanitario').mockResolvedValue(mockEstadoSanitario);

    render(
      <QueryClientProvider client={queryClient}>
        <ExpedienteAnimal />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      // El badge de conteo de crías debe indicar 2 (no 0)
      expect(screen.getByText('2')).toBeDefined();
      // Las crías reales deben listarse con sus aretes y nombres
      expect(screen.getByText(/#CR01 Lucero/i)).toBeDefined();
      expect(screen.getByText(/#CR02 Estrella/i)).toBeDefined();
    });
  });
});
