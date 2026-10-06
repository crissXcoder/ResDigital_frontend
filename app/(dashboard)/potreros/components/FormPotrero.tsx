import React, { useState } from 'react';
import { Potrero, createPotrero, updatePotrero } from '@/lib/api/potreros';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface FormPotreroProps {
  potrero?: Potrero | null;
  onClose: () => void;
}

export function FormPotrero({ potrero, onClose }: FormPotreroProps) {
  const isEditing = !!potrero;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: potrero?.nombre || '',
    areaHa: potrero?.areaHa || '',
    tipoPasto: potrero?.tipoPasto || '',
    capacidadRecomendadaUaHa: potrero?.capacidadRecomendadaUaHa || '',
    diasDescansoRecomendados: potrero?.diasDescansoRecomendados || 30,
    fuenteAgua: potrero?.fuenteAgua || '',
    estadoManual: potrero?.estadoManual || '',
    notas: potrero?.notas || '',
  });

  const mutation = useMutation({
    mutationFn: async (data: Partial<Potrero>) => {
      if (isEditing && potrero) {
        return updatePotrero(potrero.id, data);
      } else {
        return createPotrero(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['potreros'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      areaHa: Number(formData.areaHa),
      capacidadRecomendadaUaHa: Number(formData.capacidadRecomendadaUaHa),
      diasDescansoRecomendados: Number(formData.diasDescansoRecomendados),
      estadoManual: formData.estadoManual === '' ? null : formData.estadoManual,
    };
    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-navy">
            {isEditing ? 'Editar Potrero' : 'Nuevo Potrero'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <form id="potrero-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nombre del Potrero *</label>
                <input 
                  required
                  type="text" 
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
                  placeholder="Ej: La Loma"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Área (Hectáreas) *</label>
                <input 
                  required
                  type="number" 
                  step="0.1"
                  min="0.1"
                  value={formData.areaHa}
                  onChange={e => setFormData({...formData, areaHa: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Capacidad (UA/Ha) *</label>
                <input 
                  required
                  type="number" 
                  step="0.1"
                  min="0.1"
                  value={formData.capacidadRecomendadaUaHa}
                  onChange={e => setFormData({...formData, capacidadRecomendadaUaHa: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
                  placeholder="Ej: 2.5"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Días Descanso Recomendados *</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  value={formData.diasDescansoRecomendados}
                  onChange={e => setFormData({...formData, diasDescansoRecomendados: Number(e.target.value) || 0})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tipo de Pasto</label>
                <input 
                  type="text" 
                  value={formData.tipoPasto}
                  onChange={e => setFormData({...formData, tipoPasto: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
                  placeholder="Ej: Brizantha, Estrella"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Fuente de Agua</label>
                <select 
                  value={formData.fuenteAgua}
                  onChange={e => setFormData({...formData, fuenteAgua: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                >
                  <option value="">Seleccione...</option>
                  <option value="Abrevadero Artificial">Abrevadero Artificial</option>
                  <option value="Río/Quebrada">Río/Quebrada</option>
                  <option value="Naciente">Naciente</option>
                  <option value="Pozo">Pozo</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Forzar Estado (Manual)</label>
                <select 
                  value={formData.estadoManual}
                  onChange={e => setFormData({...formData, estadoManual: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                >
                  <option value="">Automático (Calculado por uso)</option>
                  <option value="EN MANTENIMIENTO">En Mantenimiento (No usar)</option>
                  <option value="DESCANSO PROGRAMADO">Descanso Programado</option>
                </select>
                <p className="text-xs text-slate-500">
                  Si se deja en Automático, el sistema calculará si está Disponible, Sobrecargado o en Recuperación según la carga animal.
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Notas / Observaciones</label>
                <textarea 
                  rows={3}
                  value={formData.notas}
                  onChange={e => setFormData({...formData, notas: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 resize-none"
                  placeholder="Detalles sobre cercas, fertilización, etc."
                />
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            form="potrero-form"
            disabled={mutation.isPending}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-navy hover:bg-navy-light rounded-full transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar Potrero'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
