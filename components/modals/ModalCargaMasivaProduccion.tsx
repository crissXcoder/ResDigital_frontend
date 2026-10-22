'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  importarProduccionLote,
  generarPlantillaCsvProduccion,
  parsearCsvProduccion,
  type FilaImportarProduccionLeche,
  type ImportarLoteResponse,
} from '@/lib/api/produccion';

interface ModalCargaMasivaProduccionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (resultado: ImportarLoteResponse) => void;
}

export default function ModalCargaMasivaProduccion({
  isOpen,
  onClose,
  onSuccess,
}: ModalCargaMasivaProduccionProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [filas, setFilas] = useState<FilaImportarProduccionLeche[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [resultadoExitoso, setResultadoExitoso] = useState<ImportarLoteResponse | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setArchivo(null);
      setFilas([]);
      setErrores([]);
      setResultadoExitoso(null);
      setErrorServidor(null);
    }
  }, [isOpen]);

  const importMutation = useMutation({
    mutationFn: (datos: { filas: FilaImportarProduccionLeche[] }) => importarProduccionLote(datos),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['produccionLeche'] });
      queryClient.invalidateQueries({ queryKey: ['produccionRegistros'] });
      queryClient.invalidateQueries({ queryKey: ['produccionResumen'] });
      queryClient.invalidateQueries({ queryKey: ['resumenProduccion'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setResultadoExitoso(data);
      if (onSuccess) onSuccess(data);
    },
    onError: (err: Error) => {
      setErrorServidor(err.message || 'Error al procesar la importación del lote.');
    },
  });

  if (!isOpen) return null;

  const descargarPlantilla = () => {
    const csvContent = generarPlantillaCsvProduccion();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_produccion_leche.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const procesarArchivo = (file: File) => {
    setArchivo(file);
    setErrorServidor(null);
    setResultadoExitoso(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const { filas: parsedFilas, errores: parsedErrores } = parsearCsvProduccion(text);
        setFilas(parsedFilas);
        setErrores(parsedErrores);
      }
    };
    reader.onerror = () => {
      setErrores(['Error al leer el archivo. Asegúrese de que sea un archivo de texto CSV válido.']);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) procesarArchivo(file);
  };

  const handleConfirmar = () => {
    if (filas.length === 0 || errores.length > 0) return;
    importMutation.mutate({ filas });
  };

  const litrosTotalesEstimados = Math.round(filas.reduce((acc, f) => acc + f.litros, 0) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-navy">Carga masiva de producción lechera</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Importe los ordeños de múltiples animales de una sola jornada mediante archivo CSV
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {resultadoExitoso ? (
            <div className="space-y-4 py-4 text-center">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-navy">¡Lote importado con éxito!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Se registraron correctamente <span className="font-bold text-navy">{resultadoExitoso.totalImportados}</span> ordeños en el sistema.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total litros</div>
                  <div className="text-lg font-bold text-navy">{resultadoExitoso.litrosTotales} L</div>
                </div>
                <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                  <div className="text-[10px] text-green-700 uppercase font-bold">Comercializable</div>
                  <div className="text-lg font-bold text-green-700">{resultadoExitoso.litrosComercializables} L</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <div className="text-[10px] text-amber-700 uppercase font-bold">Descarte</div>
                  <div className="text-lg font-bold text-amber-700">{resultadoExitoso.litrosDescarte} L</div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors"
                >
                  Entendido y cerrar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Plantilla info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-blue-900 block">¿No tiene la plantilla?</span>
                    Descargue el formato con las columnas obligatorias (<code className="font-mono text-blue-700">fecha,turno,arete_interno,litros,notas</code>).
                  </div>
                </div>
                <button
                  type="button"
                  onClick={descargarPlantilla}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
                >
                  <Download size={14} />
                  Descargar plantilla CSV
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-navy-light rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 mx-auto mb-2 border border-slate-200">
                  <Upload className="w-6 h-6 text-navy" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {archivo ? archivo.name : 'Haz clic o arrastra aquí tu archivo CSV'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Archivos delimitados por comas (.csv), codificación UTF-8 (máximo 200 filas)
                </p>
              </div>

              {/* Error messages */}
              {errores.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-red-800 text-xs font-bold">
                    <AlertCircle size={15} />
                    <span>Se encontraron errores en el archivo ({errores.length}):</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5 max-h-36 overflow-y-auto pl-1">
                    {errores.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {errorServidor && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-800 text-xs font-medium">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorServidor}</span>
                </div>
              )}

              {/* Preview Table */}
              {filas.length > 0 && errores.length === 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-navy">
                      Previsualización ({filas.length} registros listos)
                    </span>
                    <span className="font-semibold text-slate-600">
                      Total estimado: <span className="text-navy font-bold">{litrosTotalesEstimados} L</span>
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-700 whitespace-nowrap">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">Fila</th>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2">Turno</th>
                          <th className="px-3 py-2">Arete</th>
                          <th className="px-3 py-2 text-right">Litros</th>
                          <th className="px-3 py-2">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filas.map((f, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{f.fecha}</td>
                            <td className="px-3 py-2">{f.turno === 'MANANA' ? 'Mañana' : 'Tarde'}</td>
                            <td className="px-3 py-2 font-bold text-navy">#{f.areteInterno}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-800">{f.litros} L</td>
                            <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate">{f.notas || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!resultadoExitoso && (
          <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              disabled={importMutation.isPending}
              className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={filas.length === 0 || errores.length > 0 || importMutation.isPending}
              className="flex-1 py-2.5 px-4 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy-light transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Importar {filas.length > 0 ? `${filas.length} registros` : 'lote'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
