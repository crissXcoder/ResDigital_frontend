'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, AlertCircle, AlertTriangle, Ban } from 'lucide-react';
import { hoyLocal, formatearFecha } from '@/lib/reproductivo/fechas';
import { getEstadoSanitario } from '@/lib/api/sanitary';
import {
  ETIQUETA_TURNO,
  MAX_LITROS_TURNO,
  getEstadoLactancia,
  toCreateProduccionPayload,
  type CreateProduccionLecheInput,
  type TurnoOrdeno,
} from '@/lib/api/produccion';

interface ModalProduccionLecheProps {
  isOpen: boolean;
  onClose: () => void;
  animalId: string;
  animalLabel?: string;
  onSubmit: (payload: CreateProduccionLecheInput) => Promise<unknown> | void;
}

export default function ModalProduccionLeche({
  isOpen,
  onClose,
  animalId,
  animalLabel,
  onSubmit,
}: ModalProduccionLecheProps) {
  const hoy = hoyLocal();
  const [fecha, setFecha] = useState(hoy);
  const [turno, setTurno] = useState<TurnoOrdeno>('MANANA');
  const [litros, setLitros] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha <= hoy;

  const { data: lactancia, isLoading: cargandoLactancia } = useQuery({
    queryKey: ['lactancia', animalId, fecha],
    queryFn: () => getEstadoLactancia(animalId, fecha),
    enabled: isOpen && fechaValida,
  });

  const { data: sanitario } = useQuery({
    queryKey: ['estadoSanitario', animalId, fecha],
    queryFn: () => getEstadoSanitario(animalId, fecha),
    enabled: isOpen && fechaValida,
  });

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const noLactante = lactancia != null && !lactancia.enLactancia;
  const aplicacion = sanitario?.tratamientoReferencia?.fechaAplicacion ?? null;
  const retiroLeche =
    sanitario?.liberacionLeche && !(aplicacion && aplicacion > fecha)
      ? sanitario.liberacionLeche
      : null;
  const puedeGuardar = fechaValida && lactancia?.enLactancia === true && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeGuardar) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit(toCreateProduccionPayload({ animalId, fecha, turno, litros }));
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Error al guardar la producción. Inténtalo de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-navy">Registrar Producción de Leche</h2>
            {animalLabel && <p className="text-xs text-slate-500">{animalLabel}</p>}
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {noLactante && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-start gap-2">
              <Ban className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
              <span>
                El animal no está en lactancia el {formatearFecha(fecha)}. Solo una hembra en lactancia registra producción; si ya se ordeña, el propietario o administrador debe iniciar la lactancia desde la ficha.
              </span>
            </div>
          )}

          {lactancia?.enLactancia && retiroLeche && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Retiro de leche vigente{sanitario?.tratamientoReferencia ? ` por ${sanitario.tratamientoReferencia.farmaco}` : ''} hasta el {formatearFecha(retiroLeche)}: esta producción se registrará como descarte (no comercializable).
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="produccion-fecha" className="block text-sm font-semibold text-navy">Fecha</label>
            <input
              id="produccion-fecha"
              type="date"
              required
              max={hoy}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 disabled:opacity-60"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="produccion-turno" className="block text-sm font-semibold text-navy">Turno</label>
              <select
                id="produccion-turno"
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 disabled:opacity-60"
                value={turno}
                onChange={(e) => setTurno(e.target.value as TurnoOrdeno)}
              >
                {(Object.keys(ETIQUETA_TURNO) as TurnoOrdeno[]).map((t) => (
                  <option key={t} value={t}>{ETIQUETA_TURNO[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="produccion-litros" className="block text-sm font-semibold text-navy">Litros</label>
              <input
                id="produccion-litros"
                type="number"
                step="0.1"
                min="0.1"
                max={MAX_LITROS_TURNO}
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light disabled:opacity-60"
                value={litros}
                onChange={(e) => setLitros(e.target.value)}
                placeholder="Ej. 12.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!puedeGuardar}
              className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(isSubmitting || cargandoLactancia) && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar Producción
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
