'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

export interface PesajeFormData {
  fecha: string;
  peso_actual: string;
  leche_manana: string;
  leche_tarde: string;
}

interface ModalPesajeProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PesajeFormData) => Promise<unknown> | void;
  animalSexo?: string;
}

export default function ModalPesaje({ isOpen, onClose, onSubmit, animalSexo }: ModalPesajeProps) {
  const [formData, setFormData] = useState<PesajeFormData>({
    fecha: '',
    peso_actual: '',
    leche_manana: '',
    leche_tarde: '',
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
      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      console.error('Error al registrar pesaje/leche:', err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(
        errorObj?.response?.data?.message || errorObj?.message || 'Error al guardar el pesaje/leche. Inténtalo de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-navy">Registrar {animalSexo === 'Macho' ? 'Pesaje' : 'Pesaje / Leche'}</h2>
          <button onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="pesaje-fecha" className="block text-sm font-semibold text-navy">Fecha</label>
            <input
              id="pesaje-fecha"
              type="date"
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 disabled:opacity-60"
              value={formData.fecha}
              onChange={e => setFormData({ ...formData, fecha: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pesaje-peso" className="block text-sm font-semibold text-navy">Peso Actual (kg)</label>
            <input
              id="pesaje-peso"
              type="number"
              step="0.1"
              min="0"
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light disabled:opacity-60"
              value={formData.peso_actual}
              onChange={e => setFormData({ ...formData, peso_actual: e.target.value })}
              placeholder="Ej. 485"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {animalSexo !== 'Macho' && (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="pesaje-manana" className="block text-sm font-semibold text-navy">Leche Mañana (L)</label>
                  <input
                    id="pesaje-manana"
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light disabled:opacity-60"
                    value={formData.leche_manana}
                    onChange={e => setFormData({ ...formData, leche_manana: e.target.value })}
                    placeholder="8.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="pesaje-tarde" className="block text-sm font-semibold text-navy">Leche Tarde (L)</label>
                  <input
                    id="pesaje-tarde"
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light disabled:opacity-60"
                    value={formData.leche_tarde}
                    onChange={e => setFormData({ ...formData, leche_tarde: e.target.value })}
                    placeholder="5.0"
                  />
                </div>
              </>
            )}
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
