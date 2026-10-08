'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { darDeBajaAnimal, type Animal, type BajaAnimalInput } from '@/lib/api/animales';
import { hoyLocal } from '@/lib/reproductivo/fechas';

interface ModalDarBajaProps {
  isOpen: boolean;
  onClose: () => void;
  animal: Animal | null;
}

export function ModalDarBaja(props: ModalDarBajaProps) {
  if (!props.isOpen || !props.animal) return null;
  return <ModalDarBajaForm {...props} animal={props.animal} key={props.animal.id} />;
}

function ModalDarBajaForm({ isOpen, onClose, animal }: Omit<ModalDarBajaProps, 'animal'> & { animal: Animal }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    tipoBaja: '',
    motivoBaja: '',
    pesoFinalKg: '',
  });

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

  const bajaMutation = useMutation({
    mutationFn: (data: BajaAnimalInput) => darDeBajaAnimal(animal.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animales'] });
      queryClient.invalidateQueries({ queryKey: ['animal', animal?.id] });
      onClose();
    },
    onError: (error: Error) => {
      console.error(error);
      alert(error.message || 'Hubo un error al dar de baja al animal');
    }
  });

  if (!isOpen || !animal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tipoBaja: formData.tipoBaja,
      motivoBaja: formData.motivoBaja,
      pesoFinalKg: formData.pesoFinalKg ? Number(formData.pesoFinalKg) : null,
      fechaBaja: hoyLocal(),
    };
    bajaMutation.mutate(payload);
  };

  const isOtroMotivo = formData.tipoBaja === 'Otro';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-red-600">
            Dar de Baja #{animal.areteInterno}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-slate-500 mb-4">
            Al dar de baja a este animal, se registrará su salida y ya no aparecerá en el inventario activo.
          </p>
          <div>
            <label htmlFor="tipo-baja-select" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tipo de Baja *
            </label>
            <select
              id="tipo-baja-select"
              required
              value={formData.tipoBaja}
              onChange={(e) => setFormData({ ...formData, tipoBaja: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 text-slate-700"
            >
              <option value="">— Seleccione el tipo —</option>
              <option value="Venta Comercial">Venta Comercial</option>
              <option value="Fallecimiento">Fallecimiento</option>
              <option value="Descarte">Descarte</option>
              <option value="Traslado">Traslado</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {(formData.tipoBaja && formData.tipoBaja !== 'Venta Comercial') && (
            <div>
              <label htmlFor="motivo-baja-input" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Motivo / Causa / Destino
              </label>
              <input
                id="motivo-baja-input"
                required={isOtroMotivo}
                type="text"
                value={formData.motivoBaja}
                onChange={(e) => setFormData({ ...formData, motivoBaja: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 text-slate-700"
                placeholder={isOtroMotivo ? "Especifique el motivo" : "Opcional..."}
              />
            </div>
          )}

          <div>
            <label htmlFor="peso-final-input" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Peso Final (kg)
            </label>
            <input
              id="peso-final-input"
              type="number"
              min="0"
              step="0.1"
              value={formData.pesoFinalKg}
              onChange={(e) => setFormData({ ...formData, pesoFinalKg: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 text-slate-700"
              placeholder={animal.pesoActualKg ? String(animal.pesoActualKg) : "Ej. 450"}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={bajaMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {bajaMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar Baja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
