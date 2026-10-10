import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalEditarAnimal } from '@/components/modals/ModalEditarAnimal';
import { ModalDarBaja } from '@/components/modals/ModalDarBaja';
import ModalEditarOrigen from '@/components/modals/ModalEditarOrigen';
import ModalServicio from '@/components/modals/ModalServicio';
import type { Animal } from '@/lib/api/animales';
import { updateAnimal, getRazas } from '@/lib/api/animales';

vi.mock('@/lib/api/animales', () => ({
  getRazas: vi.fn().mockResolvedValue([{ id: 'raza', nombre: 'Holstein', dias_gestacion: 280 }]),
  getAnimales: vi.fn().mockResolvedValue([]),
  updateAnimal: vi.fn(),
  darDeBajaAnimal: vi.fn(),
}));
vi.mock('@/lib/api/potreros', () => ({ getPotreros: vi.fn().mockResolvedValue([]) }));
const first: Animal = { id: 'animal-1', tenantId: 'test', nombre: 'Canela', areteInterno: '104',
  sexo: 'Hembra', razaId: 'raza', categoria: 'Vaca', activo: true, pesoActualKg: 0,
  origen: 'Externa', fechaCompra: '2026-10-01T00:00:00Z', valorCompraCrc: 0 };
const second: Animal = { ...first, id: 'animal-2', nombre: 'Estrella', areteInterno: '105' };
function withQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}
beforeEach(() => {
  vi.mocked(getRazas).mockResolvedValue([{ id: 'raza', nombre: 'Holstein', dias_gestacion: 280 }]);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Sesiones de formularios del hato', () => {
  it('descarta el borrador al reabrir y al cambiar de animal; conserva el peso cero', () => {
    const props = { isOpen: true, onClose: vi.fn(), animal: first };
    const { rerender, client } = withQuery(<ModalEditarAnimal {...props} />);
    const wrap = (isOpen: boolean, animal: Animal) => <QueryClientProvider client={client}><ModalEditarAnimal {...props} isOpen={isOpen} animal={animal} /></QueryClientProvider>;
    fireEvent.change(screen.getByPlaceholderText('Ej. Mariposa'), { target: { value: 'Borrador' } });
    rerender(wrap(true, second));
    expect((screen.getByPlaceholderText('Ej. Mariposa') as HTMLInputElement).value).toBe('Estrella');
    fireEvent.change(screen.getByPlaceholderText('Ej. Mariposa'), { target: { value: 'Otro borrador' } });
    rerender(wrap(false, second)); rerender(wrap(true, second));
    expect((screen.getByPlaceholderText('Ej. Mariposa') as HTMLInputElement).value).toBe('Estrella');
    expect((screen.getByPlaceholderText('485') as HTMLInputElement).value).toBe('0');
  });

  it('inicializa fecha civil y valor cero en origen, y descarta borrador al reabrir', () => {
    const props = { isOpen: true, onClose: vi.fn(), onSubmit: vi.fn(), animal: first };
    const { rerender, client, container } = withQuery(<ModalEditarOrigen {...props} />);
    expect((container.querySelector('input[type=date]') as HTMLInputElement).value).toBe('2026-10-01');
    expect((screen.getByPlaceholderText('Ej. 850000') as HTMLInputElement).value).toBe('0');
    fireEvent.change(screen.getByPlaceholderText('Ej. Subasta Ganadera Esparza'), { target: { value: 'Borrador' } });
    rerender(<QueryClientProvider client={client}><ModalEditarOrigen {...props} isOpen={false} /></QueryClientProvider>);
    rerender(<QueryClientProvider client={client}><ModalEditarOrigen {...props} /></QueryClientProvider>);
    expect((screen.getByPlaceholderText('Ej. Subasta Ganadera Esparza') as HTMLInputElement).value).toBe('');
  });

  it('mantiene el formulario de edición y muestra el Error real si la API falla', async () => {
    vi.mocked(updateAnimal).mockRejectedValueOnce(new Error('No se pudo guardar el animal.'));
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const close = vi.fn();
    const { container } = withQuery(<ModalEditarAnimal isOpen onClose={close} animal={first} />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Holstein' })).toBeDefined(), { timeout: 3000 });
    fireEvent.change(screen.getByPlaceholderText('Ej. Mariposa'), { target: { value: 'Nombre editado' } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(alert).toHaveBeenCalledWith('No se pudo guardar el animal.'));
    expect(close).not.toHaveBeenCalled();
    expect((screen.getByPlaceholderText('Ej. Mariposa') as HTMLInputElement).value).toBe('Nombre editado');
  });

  it('descarta el motivo de baja al cambiar animal y al reabrir', () => {
    const props = { isOpen: true, onClose: vi.fn(), animal: first };
    const { client, rerender } = withQuery(<ModalDarBaja {...props} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Otro' } });
    fireEvent.change(screen.getByPlaceholderText('Especifique el motivo'), { target: { value: 'Borrador' } });
    rerender(<QueryClientProvider client={client}><ModalDarBaja {...props} animal={second} /></QueryClientProvider>);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
    rerender(<QueryClientProvider client={client}><ModalDarBaja {...props} isOpen={false} /></QueryClientProvider>);
    rerender(<QueryClientProvider client={client}><ModalDarBaja {...props} /></QueryClientProvider>);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
  });

  it('excluye el servicio no soportado y rechaza un enum introducido en el DOM', () => {
    render(<ModalServicio isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByRole('option', { name: 'Transferencia de Embriones' })).toBeNull();
    const select = screen.getByLabelText('Tipo de Servicio') as HTMLSelectElement;
    const invalid = document.createElement('option'); invalid.value = 'NO_VALIDO'; select.append(invalid);
    fireEvent.change(select, { target: { value: 'NO_VALIDO' } });
    expect(select.value).toBe('Inseminación Artificial');
  });
});
