'use client';

import { TIPOS_SERVICIO, type TipoServicio } from '@/lib/reproductivo/tipos';
import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

export interface ServicioFormData {
  tipo_servicio: TipoServicio;
  fecha: string;
  semental: string;
  inseminador: string;
  potrero: string;
  observaciones: string;
}

interface ModalServicioProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServicioFormData) => Promise<unknown> | void;
  animalSexo?: string;
}

export default function ModalServicio({ isOpen, onClose, onSubmit, animalSexo }: ModalServicioProps) {
  void animalSexo;
  const [formData, setFormData] = useState<ServicioFormData>({
    tipo_servicio: 'Inseminación Artificial',
    fecha: '',
    semental: '',
    inseminador: '',
    potrero: '',
    observaciones: '',
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
      console.error('Error al registrar servicio reproductivo:', err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(
        errorObj?.response?.data?.message || errorObj?.message || 'Error al registrar el evento reproductivo. Inténtalo de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-navy">Registrar Celo / Servicio</h2>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="servicio-tipo" className="block text-sm font-semibold text-navy">Tipo de Servicio</label>
              <select
                id="servicio-tipo"
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white disabled:opacity-60"
                value={formData.tipo_servicio}
                onChange={e => {
                  const tipo = TIPOS_SERVICIO.find(value => value === e.target.value);
                  if (tipo) setFormData({ ...formData, tipo_servicio: tipo });
                }}
              >
                <option value="Inseminación Artificial">Inseminación Artificial</option>
                <option value="Monta Natural">Monta Natural</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="servicio-fecha" className="block text-sm font-semibold text-navy">Fecha de Servicio *</label>
              <input
                id="servicio-fecha"
                type="date"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 disabled:opacity-60"
                value={formData.fecha}
                onChange={e => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="servicio-semental" className="block text-sm font-semibold text-navy">Toro / Pajilla (Semental) *</label>
              <input
                id="servicio-semental"
                type="text"
                required
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light disabled:opacity-60"
                value={formData.semental}
                onChange={e => setFormData({ ...formData, semental: e.target.value })}
                placeholder="Ej. Toro Campeón #50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="servicio-inseminador" className="block text-sm font-semibold text-navy">Inseminador / Responsable</label>
              <input
                id="servicio-inseminador"
                type="text"
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light disabled:opacity-60"
                value={formData.inseminador}
                onChange={e => setFormData({ ...formData, inseminador: e.target.value })}
                placeholder="Nombre del técnico"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="servicio-potrero" className="block text-sm font-semibold text-navy">Potrero</label>
              <input
                id="servicio-potrero"
                type="text"
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light disabled:opacity-60"
                value={formData.potrero}
                onChange={e => setFormData({ ...formData, potrero: e.target.value })}
                placeholder="Ej. Potrero 4"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="servicio-observaciones" className="block text-sm font-semibold text-navy">Observaciones</label>
              <textarea
                id="servicio-observaciones"
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light disabled:opacity-60"
                value={formData.observaciones}
                onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas..."
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
              Registrar y Programar Alertas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
