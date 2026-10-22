import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDescendenciaAnimal } from '@/lib/api/animales';

const { fetchApi } = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  fetchApi,
}));

describe('getDescendenciaAnimal (RF-005)', () => {
  afterEach(() => vi.clearAllMocks());

  it('consulta la descendencia mediante la ruta del expediente', async () => {
    fetchApi.mockResolvedValue([]);

    await expect(getDescendenciaAnimal('animal-1')).resolves.toEqual([]);
    expect(fetchApi).toHaveBeenCalledWith('/animales/animal-1/descendencia');
  });
});
