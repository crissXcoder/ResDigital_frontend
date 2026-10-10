import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ModalPesaje from '@/components/modals/ModalPesaje';
import ModalServicio from '@/components/modals/ModalServicio';
import ModalDiagnostico from '@/components/modals/ModalDiagnostico';

describe('UX segura de mutaciones asíncronas (CORE-T003)', () => {
  describe('ModalPesaje', () => {
    it('deshabilita el botón durante el envío y muestra spinner', async () => {
      let resolvePromise: (value?: unknown) => void;
      const deferredPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const onSubmitMock = vi.fn().mockReturnValue(deferredPromise);
      const onCloseMock = vi.fn();

      render(
        <ModalPesaje
          isOpen={true}
          onClose={onCloseMock}
          onSubmit={onSubmitMock}
        />,
      );

      const submitButton = screen.getByRole('button', { name: /guardar pesaje/i }) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(false);

      // Rellenar datos
      const dateInput = screen.getByLabelText(/fecha/i);
      fireEvent.change(dateInput, { target: { value: '2026-10-02' } });
      fireEvent.change(screen.getByLabelText(/peso actual/i), { target: { value: '480' } });

      fireEvent.click(submitButton);

      // Botón debe estar deshabilitado mientras se procesa
      expect(submitButton.disabled).toBe(true);
      expect(onSubmitMock).toHaveBeenCalledTimes(1);
      expect(onSubmitMock).toHaveBeenCalledWith({ fecha: '2026-10-02', peso_actual: '480' });

      // Resolver la promesa
      resolvePromise!();
      await waitFor(() => {
        expect(onCloseMock).toHaveBeenCalledTimes(1);
      });
    });

    it('no cierra el modal si la mutación falla, muestra el error y conserva los datos ingresados', async () => {
      const onSubmitMock = vi.fn().mockRejectedValue(new Error('Fallo de red en la API'));
      const onCloseMock = vi.fn();

      render(
        <ModalPesaje
          isOpen={true}
          onClose={onCloseMock}
          onSubmit={onSubmitMock}
        />,
      );

      const dateInput = screen.getByLabelText(/fecha/i) as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2026-10-02' } });

      const pesoInput = screen.getByPlaceholderText(/ej\. 485/i) as HTMLInputElement;
      fireEvent.change(pesoInput, { target: { value: '520.5' } });

      const submitButton = screen.getByRole('button', { name: /guardar pesaje/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Fallo de red en la API')).toBeDefined();
      });

      // El modal no se cerró
      expect(onCloseMock).not.toHaveBeenCalled();

      // Conserva los datos ingresados
      expect(dateInput.value).toBe('2026-10-02');
      expect(pesoInput.value).toBe('520.5');
    });
  });

  describe('ModalServicio', () => {
    it('deshabilita el botón durante el envío y cierra solo tras éxito', async () => {
      let resolvePromise: (value?: unknown) => void;
      const deferredPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const onSubmitMock = vi.fn().mockReturnValue(deferredPromise);
      const onCloseMock = vi.fn();

      render(
        <ModalServicio
          isOpen={true}
          onClose={onCloseMock}
          onSubmit={onSubmitMock}
        />,
      );

      const submitButton = screen.getByRole('button', { name: /registrar y programar alertas/i }) as HTMLButtonElement;

      // Rellenar campos obligatorios
      const dateInput = screen.getByLabelText(/fecha de servicio/i);
      fireEvent.change(dateInput, { target: { value: '2026-10-02' } });

      const sementalInput = screen.getByPlaceholderText(/ej\. toro campeón/i);
      fireEvent.change(sementalInput, { target: { value: 'Toro Supremo' } });

      fireEvent.click(submitButton);

      expect(submitButton.disabled).toBe(true);

      resolvePromise!();
      await waitFor(() => {
        expect(onCloseMock).toHaveBeenCalledTimes(1);
      });
    });

    it('en caso de error no cierra el modal, muestra mensaje y conserva los campos', async () => {
      const onSubmitMock = vi.fn().mockRejectedValue(new Error('Conflicto con ciclo reproductivo previo'));
      const onCloseMock = vi.fn();

      render(
        <ModalServicio
          isOpen={true}
          onClose={onCloseMock}
          onSubmit={onSubmitMock}
        />,
      );

      const dateInput = screen.getByLabelText(/fecha de servicio/i) as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2026-10-02' } });

      const sementalInput = screen.getByPlaceholderText(/ej\. toro campeón/i) as HTMLInputElement;
      fireEvent.change(sementalInput, { target: { value: 'Toro Supremo' } });

      const submitButton = screen.getByRole('button', { name: /registrar y programar alertas/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Conflicto con ciclo reproductivo previo')).toBeDefined();
      });

      expect(onCloseMock).not.toHaveBeenCalled();
      expect(dateInput.value).toBe('2026-10-02');
      expect(sementalInput.value).toBe('Toro Supremo');
    });
  });

  describe('ModalDiagnostico', () => {
    it('retiene datos y muestra error si la confirmación falla', async () => {
      const onSubmitMock = vi.fn().mockRejectedValue(new Error('Animal no encontrado'));
      const onCloseMock = vi.fn();

      render(
        <ModalDiagnostico
          isOpen={true}
          onClose={onCloseMock}
          onSubmit={onSubmitMock}
          eventoServicioId="srv-123"
        />,
      );

      const notasInput = screen.getByPlaceholderText(/notas\.\.\./i) as HTMLTextAreaElement;
      fireEvent.change(notasInput, { target: { value: 'Diagnóstico por ultrasonido confirmado' } });

      const submitButton = screen.getByRole('button', { name: /registrar confirmación/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Animal no encontrado')).toBeDefined();
      });

      expect(onCloseMock).not.toHaveBeenCalled();
      expect(notasInput.value).toBe('Diagnóstico por ultrasonido confirmado');
    });
  });
});
