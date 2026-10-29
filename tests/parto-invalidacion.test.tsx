import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useRegistrarParto } from '@/lib/hooks/use-reproductivo';
import { registrarPartoReproductivo } from '@/lib/api/reproductivo';

vi.mock('@/lib/api/reproductivo', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/reproductivo')>(
    '@/lib/api/reproductivo',
  );
  return {
    ...actual,
    registrarPartoReproductivo: vi.fn(),
  };
});

describe('useRegistrarParto — invalidación', () => {
  it('invalida estado, historial, feed y la lista de animales tras un parto', async () => {
    vi.mocked(registrarPartoReproductivo).mockResolvedValue({
      parto: { criaAnimalId: null, criaAnteriorId: 'cria-anterior' },
    } as never);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRegistrarParto('madre-1'), {
      wrapper,
    });
    await result.current.mutateAsync({ fechaEvento: '2026-09-10' });

    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    const keys = invalidate.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toContainEqual(['estadoReproductivo', 'madre-1']);
    expect(keys).toContainEqual(['historialReproductivo', 'madre-1']);
    expect(keys).toContainEqual(['dashboard', 'proximos-eventos-reproductivos']);
    expect(keys).toContainEqual(['animales']);
    expect(keys).toContainEqual(['criasAnimal', 'madre-1']);
    expect(keys).toContainEqual(['descendenciaAnimal', 'madre-1']);
    expect(keys).toContainEqual(['animal', 'cria-anterior']);
  });
});
