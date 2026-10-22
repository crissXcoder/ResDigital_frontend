import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ModalDocumento from '@/components/modals/ModalDocumento';

describe('ModalDocumento', () => {
  it('muestra validación y conserva el archivo cuando falla el guardado', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('No se pudo subir el archivo.'));
    const onClose = vi.fn();
    const { container } = render(
      <ModalDocumento isOpen onClose={onClose} onSubmit={onSubmit} isUploading={false} />,
    );
    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('No se encontró el selector de archivo.');

    fireEvent.change(input, { target: { files: [new File(['x'], 'invalido.webp', { type: 'image/webp' })] } });
    expect(screen.getByRole('alert').textContent).toMatch(/PDF, PNG o JPG/);

    fireEvent.change(input, { target: { files: [new File(['%PDF-1'], 'cartilla.pdf', { type: 'application/pdf' })] } });
    fireEvent.change(screen.getByLabelText('Tipo de Documento'), { target: { value: 'Cartilla sanitaria' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Documento' }));

    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo subir el archivo.');
    expect(screen.getByText('cartilla.pdf')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('limpia y cierra después de un guardado exitoso', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { container } = render(
      <ModalDocumento isOpen onClose={onClose} onSubmit={onSubmit} isUploading={false} />,
    );
    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('No se encontró el selector de archivo.');

    fireEvent.change(input, { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } });
    fireEvent.change(screen.getByLabelText('Tipo de Documento'), { target: { value: 'Fotografía' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Documento' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith({ tipo: 'Fotografía', file: expect.any(File) });
  });
});
