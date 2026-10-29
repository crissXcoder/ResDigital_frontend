import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModalCargaMasivaProduccion from '@/components/modals/ModalCargaMasivaProduccion';
import {
  generarPlantillaCsvProduccion,
  parsearCsvProduccion,
  importarProduccionLote,
  type ImportarLoteResponse,
} from '@/lib/api/produccion';

vi.mock('@/lib/api/produccion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/produccion')>();
  return {
    ...actual,
    importarProduccionLote: vi.fn(),
  };
});

function renderConQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('OBS-004 — Importación masiva de producción lechera mediante CSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('generarPlantillaCsvProduccion', () => {
    it('genera un CSV con los encabezados exactos requeridos y filas de ejemplo', () => {
      const csv = generarPlantillaCsvProduccion();
      expect(csv).toContain('fecha,turno,arete_interno,litros,notas');
      expect(csv).toMatch(/\d{4}-\d{2}-\d{2},Mañana,101,15\.5/);
    });
  });

  describe('parsearCsvProduccion', () => {
    it('parsea un CSV válido preservando aretes y normalizando el turno', () => {
      const csv = `fecha,turno,arete_interno,litros,notas\n2026-10-21,Mañana,#101,15.5,Ordeño matutino\n2026-10-21,Tarde,102,12.0,`;
      const { filas, errores } = parsearCsvProduccion(csv);

      expect(errores).toHaveLength(0);
      expect(filas).toHaveLength(2);
      expect(filas[0]).toEqual({
        fecha: '2026-10-21',
        turno: 'MANANA',
        areteInterno: '#101',
        litros: 15.5,
        notas: 'Ordeño matutino',
      });
      expect(filas[1]).toEqual({
        fecha: '2026-10-21',
        turno: 'TARDE',
        areteInterno: '102',
        litros: 12.0,
        notas: undefined,
      });
    });

    it('conserva texto de notas citado sin evaluarlo ni modificarlo', () => {
      const csv = `fecha,turno,arete_interno,litros,notas\n2026-10-21,Mañana,101,10.0,=SUM(A1:A10)\n2026-10-21,Mañana,102,12.0,"@HYPERLINK(""http://evil.com"")"`;
      const { filas, errores } = parsearCsvProduccion(csv);

      expect(errores).toHaveLength(0);
      expect(filas[0].notas).toBe('=SUM(A1:A10)');
      expect(filas[1].notas).toBe('@HYPERLINK("http://evil.com")');
    });

    it('respeta comas, comillas y saltos de línea dentro de notas; rechaza precisión que la BD redondearía', () => {
      const csv = 'fecha,turno,arete_interno,litros,notas\r\n2026-10-21,MANANA,0007,12.5,"Ordeño, revisión"\r\n2026-10-21,TARDE,0008,12.55,"Dijo ""bien""\ny siguió"';
      const { errores } = parsearCsvProduccion(csv);

      expect(errores).toHaveLength(1);
      expect(errores[0]).toContain('Fila 2: Litros');
      const texto = parsearCsvProduccion('fecha,turno,arete_interno,litros,notas\n2026-10-21,MANANA,0007,12.5,"Ordeño, revisión"\n2026-10-21,TARDE,0008,12.0,"Dijo ""bien""\ny siguió"');
      expect(texto.errores).toHaveLength(0);
      expect(texto.filas[1].notas).toBe('Dijo "bien"\ny siguió');
    });

    it('rechaza comillas sin cerrar, columnas duplicadas y encabezados desconocidos', () => {
      const csv = 'fecha,turno,arete_interno,litros,litros\n2026-10-21,MANANA,A,10.0,10.0';
      expect(parsearCsvProduccion(csv).errores[0]).toContain('duplicada');
      expect(parsearCsvProduccion('fecha,turno,arete_interno,litros,extra\n2026-10-21,MANANA,A,10.0,x').errores[0]).toContain('desconocida');
      expect(parsearCsvProduccion('fecha,turno,arete_interno,litros,notas\n2026-10-21,MANANA,A,10.0,"sin cerrar').errores[0]).toContain('sin cerrar');
    });

    it('rechaza CSV vacío o que solo tiene cabecera', () => {
      const { filas, errores } = parsearCsvProduccion('fecha,turno,arete_interno,litros,notas\n');
      expect(filas).toHaveLength(0);
      expect(errores[0]).toContain('vacío o solo contiene la cabecera');
    });

    it('rechaza CSV con columnas faltantes requeridas', () => {
      const { filas, errores } = parsearCsvProduccion('fecha,litros\n2026-10-21,15.0');
      expect(filas).toHaveLength(0);
      expect(errores[0]).toContain('Formato inválido');
    });

    it('señala errores específicos con número de fila cuando hay datos corruptos', () => {
      const csv = `fecha,turno,arete_interno,litros,notas\n21-10-2026,Mañana,101,15.0,\n2026-10-21,Mediodia,102,15.0,\n2026-10-21,Mañana,,15.0,\n2026-10-21,Mañana,103,99.0,`;
      const { filas, errores } = parsearCsvProduccion(csv);

      expect(filas).toHaveLength(0);
      expect(errores).toHaveLength(4);
      expect(errores[0]).toContain('Fila 1: Fecha');
      expect(errores[1]).toContain('Fila 2: Turno');
      expect(errores[2]).toContain('Fila 3: El arete interno es requerido');
      expect(errores[3]).toContain('Fila 4: Litros');
    });

    it('rechaza lotes de más de 200 filas', () => {
      let csv = 'fecha,turno,arete_interno,litros,notas\n';
      for (let i = 1; i <= 205; i++) {
        csv += `2026-10-21,Mañana,${i},10.0,\n`;
      }
      const { filas, errores } = parsearCsvProduccion(csv);
      expect(filas).toHaveLength(0);
      expect(errores[0]).toContain('El máximo permitido por lote es 200');
    });
  });

  describe('ModalCargaMasivaProduccion UI', () => {
    it('permite cerrar tras reemplazar una lectura pendiente por un archivo demasiado grande', async () => {
      const onClose = vi.fn();
      renderConQuery(<ModalCargaMasivaProduccion isOpen onClose={onClose} />);
      const lento = new File(['pendiente'], 'lento.csv');
      let completar!: (value: ArrayBuffer) => void;
      Object.defineProperty(lento, 'arrayBuffer', { value: () => new Promise<ArrayBuffer>((resolve) => { completar = resolve; }) });
      const input = screen.getByLabelText('Archivo CSV de producción');
      fireEvent.change(input, { target: { files: [lento] } });
      const grande = new File(['x'], 'grande.csv');
      Object.defineProperty(grande, 'size', { value: 4 * 1024 * 1024 + 1 });
      fireEvent.change(input, { target: { files: [grande] } });
      expect(screen.getByText(/supera el tamaño máximo/)).toBeDefined();
      completar(new ArrayBuffer(0));
      fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
      await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    });

    it('permite cargar archivo CSV, previsualizar filas y confirmar importación exitosa', async () => {
      const mockRespuesta: ImportarLoteResponse = {
        totalImportados: 2,
        litrosTotales: 27.5,
        litrosComercializables: 27.5,
        litrosDescarte: 0,
        registros: [],
      };
      vi.mocked(importarProduccionLote).mockResolvedValue(mockRespuesta);

      const onClose = vi.fn();
      const onSuccess = vi.fn();

      renderConQuery(
        <ModalCargaMasivaProduccion isOpen={true} onClose={onClose} onSuccess={onSuccess} />,
      );

      expect(screen.getByText('Carga masiva de producción lechera')).toBeDefined();
      expect(screen.getByRole('button', { name: /descargar plantilla csv/i })).toBeDefined();

      // Cargar archivo
      const file = new File(
        [`fecha,turno,arete_interno,litros,notas\n2026-10-21,Mañana,101,15.5,Matutino\n2026-10-21,Tarde,102,12.0,Vespertino`],
        'ordeño_hoy.csv',
        { type: 'text/csv' },
      );

      const input = screen.getByLabelText('Archivo CSV de producción');
      expect(input).toBeDefined();
      fireEvent.change(input!, { target: { files: [file] } });

      // Esperar previsualización
      await waitFor(() => {
        expect(screen.getByText(/previsualización/i)).toBeDefined();
        expect(screen.getByText('101')).toBeDefined();
        expect(screen.getByText('102')).toBeDefined();
        expect(screen.getByText('15.5 L')).toBeDefined();
        expect(screen.getByText('12 L')).toBeDefined();
      });

      // Confirmar botón
      const btnImportar = screen.getByRole('button', { name: /importar 2 registros/i });
      fireEvent.click(btnImportar);

      await waitFor(() => {
        expect(importarProduccionLote).toHaveBeenCalledWith({
          filas: [
            { fecha: '2026-10-21', turno: 'MANANA', areteInterno: '101', litros: 15.5, notas: 'Matutino' },
            { fecha: '2026-10-21', turno: 'TARDE', areteInterno: '102', litros: 12.0, notas: 'Vespertino' },
          ],
        });
        expect(screen.getByText(/¡lote importado con éxito!/i)).toBeDefined();
        expect(screen.getAllByText('27.5 L').length).toBeGreaterThanOrEqual(1);
        expect(onSuccess).toHaveBeenCalledWith(mockRespuesta);
      });
    });

    it('muestra errores del servidor si la transacción de lote es rechazada', async () => {
      vi.mocked(importarProduccionLote).mockRejectedValue(
        new Error('Fila 2: El animal con arete 102 no está en lactancia.'),
      );

      renderConQuery(
        <ModalCargaMasivaProduccion isOpen={true} onClose={vi.fn()} />,
      );

      const file = new File(
        [`fecha,turno,arete_interno,litros,notas\n2026-10-21,Mañana,101,15.5,\n2026-10-21,Mañana,102,12.0,`],
        'ordeño.csv',
        { type: 'text/csv' },
      );

      const input = screen.getByLabelText('Archivo CSV de producción');
      fireEvent.change(input!, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/previsualización/i)).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /importar 2 registros/i }));

      await waitFor(() => {
        expect(screen.getByText(/Fila 2: El animal con arete 102 no está en lactancia/i)).toBeDefined();
      });
    });
  });
});
