import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ModalQrAnimal from '@/components/modals/ModalQrAnimal';
import {
  getAnimalQrTargetUrl,
  parseAnimalQrPayload,
  generateAnimalQrDataUrl,
} from '@/lib/qr/generate-animal-qr';

describe('Generación de QR Interno Real (QR-T001 / FL-09)', () => {
  const mockAnimal = {
    id: 'anim-uuid-456',
    areteInterno: '104',
    nombre: 'Mariposa',
    numeroOficialDiio: 'CR-01-998877',
    sexo: 'Hembra',
    raza: 'Jersey',
  };

  describe('Utilidades de Generación y Validación de Payload (lib/qr)', () => {
    it('genera una ruta interna estable hacia /hato/:id sin datos sensibles en el payload', () => {
      const url = getAnimalQrTargetUrl('anim-uuid-456', 'https://app.resdigital.cr');

      expect(url).toBe('https://app.resdigital.cr/hato/anim-uuid-456');

      // Invariante de seguridad (FL-09): el QR NO contiene historial médico, PII ni contraseñas
      expect(url).not.toContain('tratamiento');
      expect(url).not.toContain('diagnostico');
      expect(url).not.toContain('propietario');
    });

    it('genera un DataURL PNG válido para el código QR', async () => {
      const dataUrl = await generateAnimalQrDataUrl('anim-uuid-456');

      expect(dataUrl).toBeDefined();
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('parseAnimalQrPayload valida y extrae el ID de animal de rutas relativas y absolutas', () => {
      // Ruta relativa
      const relResult = parseAnimalQrPayload('/hato/anim-uuid-456');
      expect(relResult.isValid).toBe(true);
      expect(relResult.animalId).toBe('anim-uuid-456');

      // URL absoluta
      const absResult = parseAnimalQrPayload('https://resdigital.cr/hato/anim-uuid-456');
      expect(absResult.isValid).toBe(true);
      expect(absResult.animalId).toBe('anim-uuid-456');
    });

    it('parseAnimalQrPayload rechaza payloads inválidos, externos o maliciosos', () => {
      // URL externa no relacionada
      const extResult = parseAnimalQrPayload('https://phishing.com/animal/123');
      expect(extResult.isValid).toBe(false);
      expect(extResult.animalId).toBeNull();

      // String vacío
      const emptyResult = parseAnimalQrPayload('');
      expect(emptyResult.isValid).toBe(false);

      // Ruta arbitraria distinta de expediente
      const wrongRoute = parseAnimalQrPayload('/usuarios/admin');
      expect(wrongRoute.isValid).toBe(false);
    });
  });

  describe('Componente ModalQrAnimal', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Mock clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('renderiza la etiqueta de manejo con advertencia regulatoria de que NO sustituye DIIO', async () => {
      render(
        <ModalQrAnimal
          isOpen={true}
          onClose={vi.fn()}
          animal={mockAnimal}
          nombreFinca="Finca San Martín"
        />,
      );

      // Título y arete de manejo
      expect(screen.getByRole('heading', { name: /código qr de expediente/i })).toBeDefined();
      expect(screen.getByText(/arete #104/i)).toBeDefined();
      expect(screen.getByText('Mariposa')).toBeDefined();
      expect(screen.getByText('Finca San Martín')).toBeDefined();

      // Advertencia regulatoria explícita (CR-T001 / Normativa Costa Rica)
      expect(
        screen.getByText(
          /no sustituye ni reemplaza el arete o dispositivo de identificación individual oficial \(diio\)/i,
        ),
      ).toBeDefined();
      expect(screen.getByText('CR-01-998877')).toBeDefined();
    });

    it('genera la imagen QR y muestra los botones de descarga y copiado', async () => {
      render(
        <ModalQrAnimal
          isOpen={true}
          onClose={vi.fn()}
          animal={mockAnimal}
          nombreFinca="Finca San Martín"
        />,
      );

      // Esperar a que se genere la imagen del QR
      await waitFor(() => {
        const qrImg = screen.getByRole('img', {
          name: /código qr para animal #104/i,
        });
        expect(qrImg).toBeDefined();
      });

      // Botón de descargar PNG
      const downloadBtn = screen.getByRole('button', { name: /descargar png/i });
      expect(downloadBtn).toBeDefined();

      // Botón de copiar enlace
      const copyBtn = screen.getByRole('button', { name: /copiar/i });
      expect(copyBtn).toBeDefined();

      fireEvent.click(copyBtn);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('cierra el modal al pulsar el botón de cerrar o la X', () => {
      const onCloseMock = vi.fn();

      render(
        <ModalQrAnimal
          isOpen={true}
          onClose={onCloseMock}
          animal={mockAnimal}
        />,
      );

      const closeBtn = screen.getByRole('button', { name: /^cerrar$/i });
      fireEvent.click(closeBtn);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('soporta animales donde raza es un objeto de entidad de la base de datos sin crashear', async () => {
      const animalConRazaObjeto = {
        id: 'anim-506',
        areteInterno: '506',
        nombre: 'pablo',
        numeroOficialDiio: null,
        raza: {
          id: 'raza-brahman-uuid',
          tenantId: 'finca-001',
          nombre: 'Brahman',
          diasGestacion: 293,
          createdAt: '2026-01-01T00:00:00Z',
        },
      };

      render(
        <ModalQrAnimal
          isOpen={true}
          onClose={vi.fn()}
          animal={animalConRazaObjeto}
          nombreFinca="Finca San Martín"
        />,
      );

      expect(screen.getByText('Arete #506')).toBeDefined();
      expect(screen.getByText('pablo')).toBeDefined();
      expect(screen.getByText('Brahman')).toBeDefined();
    });
  });
});

