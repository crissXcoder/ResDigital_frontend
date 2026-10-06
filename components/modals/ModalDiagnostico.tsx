'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { hoyLocal } from '@/lib/reproductivo/fechas';

export interface DiagnosticoFormData {
  fechaEvento: string;
  metodo: string;
  resultado: string;
  notas: string;
  eventoServicioId: string;
}

interface ModalDiagnosticoProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DiagnosticoFormData) => Promise<unknown> | void;
  eventoServicioId: string;
}

export default function ModalDiagnostico({ isOpen, onClose, onSubmit, eventoServicioId }: ModalDiagnosticoProps) {
  const [formData, setFormData] = useState({
    fechaEvento: hoyLocal(),
    metodo: 'Palpación',
    resultado: 'Preñada',
    notas: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit({
        ...formData,
        eventoServicioId,
      });
      onClose();
    } catch (err: unknown) {
      console.error('Error al registrar diagnóstico:', err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(
        errorObj?.response?.data?.message || errorObj?.message || 'Error al guardar el diagnóstico. Inténtalo de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-navy">Confirmar Preñez (Diagnóstico)</h2>
          <button onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-navy">Fecha de Confirmación *</label>
              <input
                type="date"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 disabled:opacity-60"
                value={formData.fechaEvento}
                onChange={e => setFormData({ ...formData, fechaEvento: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-navy">Método de Diagnóstico *</label>
              <select
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white disabled:opacity-60"
                value={formData.metodo}
                onChange={e => setFormData({ ...formData, metodo: e.target.value })}
              >
                <option value="Palpación">Palpación</option>
                <option value="Ecografía">Ecografía</option>
                <option value="PAG">PAG</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-navy">Resultado *</label>
              <select
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white disabled:opacity-60"
                value={formData.resultado}
                onChange={e => setFormData({ ...formData, resultado: e.target.value })}
              >
                <option value="Preñada">Preñada (Positivo)</option>
                <option value="Vacía">Vacía (Negativo)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-navy">Observaciones</label>
              <textarea
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light disabled:opacity-60"
                value={formData.notas}
                onChange={e => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Notas..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar Confirmación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
