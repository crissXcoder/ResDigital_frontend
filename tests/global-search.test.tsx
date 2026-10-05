import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalSearch } from '@/components/dashboard/global-search';
import * as animalesApi from '@/lib/api/animales';

vi.mock('@/lib/api/animales', () => ({
  getAnimales: vi.fn(),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('GlobalSearch Component (DASH-T002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el input de búsqueda con accesibilidad correcta', () => {
    renderWithClient(<GlobalSearch />);

    const input = screen.getByRole('combobox', {
      name: /buscar animal por arete, diio o nombre/i,
    });
    expect(input).toBeDefined();
    expect(input.getAttribute('placeholder')).toContain('Buscar arete');
  });

  it('no muestra el dropdown cuando el input está vacío', () => {
    renderWithClient(<GlobalSearch />);

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('muestra resultados reales con arete, nombre, DIIO y enlace al expediente (/hato/:id)', async () => {
    const mockAnimales: animalesApi.Animal[] = [
      {
        id: 'uuid-animal-104',
        tenantId: 'tenant-1',
        areteInterno: '104',
        nombre: 'Canela',
        numeroOficialDiio: 'CR-998877',
        sexo: 'Hembra',
        razaId: 'raza-1',
        categoria: 'Vaca Adulta',
        activo: true,
      },
    ];

    vi.mocked(animalesApi.getAnimales).mockResolvedValue(mockAnimales);

    renderWithClient(<GlobalSearch />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Canela' } });

    await waitFor(() => {
      expect(animalesApi.getAnimales).toHaveBeenCalledWith({ buscar: 'Canela' });
    });

    await waitFor(() => {
      expect(screen.getByText('#104')).toBeDefined();
      expect(screen.getByText('Canela')).toBeDefined();
      expect(screen.getByText(/DIIO: CR-998877/)).toBeDefined();
      expect(screen.getByText(/Vaca Adulta/)).toBeDefined();
    });

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/hato/uuid-animal-104');
  });

  it('muestra mensaje cuando no hay coincidencias', async () => {
    vi.mocked(animalesApi.getAnimales).mockResolvedValue([]);

    renderWithClient(<GlobalSearch />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'inexistente' } });

    await waitFor(() => {
      expect(screen.getByText(/Ningún animal coincide con/i)).toBeDefined();
      expect(screen.getByText('inexistente')).toBeDefined();
    });
  });

  it('manejo de error sin fallback silencioso ni mocks', async () => {
    vi.mocked(animalesApi.getAnimales).mockRejectedValue(
      new Error('Fallo de conexión'),
    );

    renderWithClient(<GlobalSearch />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '104' } });

    await waitFor(() => {
      expect(screen.getByText('Error al buscar animales')).toBeDefined();
      expect(screen.getByText('Fallo de conexión')).toBeDefined();
    });
  });

  it('permite limpiar la búsqueda con el botón de limpiar', async () => {
    vi.mocked(animalesApi.getAnimales).mockResolvedValue([]);

    renderWithClient(<GlobalSearch />);

    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '104' } });

    const clearButton = screen.getByRole('button', { name: /limpiar búsqueda/i });
    fireEvent.click(clearButton);

    expect(input.value).toBe('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
