import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QrScannerPage from '@/app/(dashboard)/qr/page';
import * as animalesApi from '@/lib/api/animales';

vi.mock('@/lib/api/animales', () => ({
  getAnimales: vi.fn(),
}));

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('QR Scanner Page (QR-T002)', () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    });
  });

  it('muestra estado cuando el navegador no soporta getUserMedia', async () => {
    // Mock navigator without mediaDevices
    const originalMediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    render(<QrScannerPage />);

    expect(
      await screen.findByText(/no soporta acceso a cámara en tiempo real/i),
    ).toBeDefined();

    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    });
  });

  it('maneja y muestra error cuando el permiso de cámara es denegado (NotAllowedError)', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue({
      name: 'NotAllowedError',
      message: 'Permission denied',
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
      writable: true,
    });

    render(<QrScannerPage />);

    expect(await screen.findByText(/permiso de cámara bloqueado/i)).toBeDefined();
    expect(
      screen.getByText(/el navegador no tiene permiso para activar la cámara/i),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /reintentar permiso/i })).toBeDefined();
  });

  it('muestra error amigable cuando no se encuentra sensor de cámara (NotFoundError)', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue({
      name: 'NotFoundError',
      message: 'No video input devices found',
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
      writable: true,
    });

    render(<QrScannerPage />);

    expect(await screen.findByText(/cámara no disponible/i)).toBeDefined();
    expect(
      screen.getByText(/no se detectó un sensor de cámara activo/i),
    ).toBeDefined();
  });

  it('permite búsqueda manual por arete y redirige directamente al expediente si existe', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('No camera')) },
      configurable: true,
      writable: true,
    });

    vi.mocked(animalesApi.getAnimales).mockResolvedValueOnce([
      { id: 'uuid-pablo-506', areteInterno: '506', nombre: 'pablo' } as unknown as animalesApi.Animal,
    ]);

    render(<QrScannerPage />);

    const areteInput = screen.getByPlaceholderText(/ej\. #104 o diio/i);
    const searchBtn = screen.getByRole('button', { name: /buscar/i });

    fireEvent.change(areteInput, { target: { value: '#506' } });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/hato/uuid-pablo-506');
    });
  });

  it('muestra alerta de error visible en pantalla si el animal buscado no existe', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('No camera')) },
      configurable: true,
      writable: true,
    });

    vi.mocked(animalesApi.getAnimales).mockResolvedValueOnce([]);

    render(<QrScannerPage />);

    const areteInput = screen.getByPlaceholderText(/ej\. #104 o diio/i);
    const searchBtn = screen.getByRole('button', { name: /buscar/i });

    fireEvent.change(areteInput, { target: { value: '#999' } });
    fireEvent.click(searchBtn);

    expect(
      await screen.findByText(/no se encontró ningún animal con el arete o diio "#999" en este hato/i),
    ).toBeDefined();
    // No debe redirigir a otra página
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('muestra nota de seguridad y aislamiento por finca (FL-09)', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockReturnValue(new Promise(() => {})) },
      configurable: true,
      writable: true,
    });

    render(<QrScannerPage />);

    expect(screen.getByText(/seguridad y aislamiento por finca/i)).toBeDefined();
  });

  it('permite subir un archivo de imagen para escanear', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockReturnValue(new Promise(() => {})) },
      configurable: true,
      writable: true,
    });

    render(<QrScannerPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.accept).toBe('image/*');
  });
});

