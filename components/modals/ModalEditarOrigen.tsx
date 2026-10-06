'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAnimales, type Animal } from '@/lib/api/animales';

export interface OrigenFormData {
  origen: 'Finca' | 'Externa';
  padre: string;
  madre: string;
  compradoA: string;
  fechaCompra: string;
  valorCompraCrc: number | null;
  numeroGuia: string;
}

interface ModalEditarOrigenProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OrigenFormData) => void;
  animal: Animal | null;
}

export default function ModalEditarOrigen(props: ModalEditarOrigenProps) {
  if (!props.isOpen || !props.animal) return null;
  return <ModalEditarOrigenForm {...props} animal={props.animal} key={props.animal.id} />;
}

function ModalEditarOrigenForm({ isOpen, onClose, onSubmit, animal }: Omit<ModalEditarOrigenProps, 'animal'> & { animal: Animal }) {
  const [origen, setOrigen] = useState<'Finca' | 'Externa'>(animal?.origen || 'Finca');
  const [padre, setPadre] = useState(animal?.padreId || '');
  const [madre, setMadre] = useState(animal?.madreId || '');
  
  // Campos de compra
  const [compradoA, setCompradoA] = useState(animal?.compradoA || '');
  const [fechaCompra, setFechaCompra] = useState(animal.fechaCompra?.split('T')[0] || '');
  const [valorCompraCrc, setValorCompraCrc] = useState(animal.valorCompraCrc == null ? '' : String(animal.valorCompraCrc));
  const [numeroGuia, setNumeroGuia] = useState(animal?.numeroGuia || '');

  const { data: animales, isLoading } = useQuery({
    queryKey: ['animales'],
    queryFn: () => getAnimales({ activo: 'true' }),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ 
      origen, 
      padre, 
      madre,
      compradoA,
      fechaCompra,
      valorCompraCrc: valorCompraCrc ? parseFloat(valorCompraCrc) : null,
      numeroGuia
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy">Editar Origen y Genealogía</h2>
            <p className="text-sm text-slate-500 mt-1">Animal: <span className="font-semibold text-navy">#{animal?.areteInterno} — {animal?.nombre}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-navy uppercase tracking-wider">Tipo de Origen</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-200">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  origen === 'Finca' ? 'bg-navy text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setOrigen('Finca')}
              >
                Nacida en Finca
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  origen === 'Externa' ? 'bg-navy text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setOrigen('Externa')}
              >
                Comprada / Externa
              </button>
            </div>
          </div>

          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 space-y-4">
            {origen === 'Finca' ? (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Toro Padre (Semental de la Finca)</label>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                    value={padre}
                    onChange={e => setPadre(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="">-- Seleccionar Toro Padre --</option>
                    {animales?.filter(a => a.sexo === 'Macho').map(a => (
                      <option key={a.id} value={a.id}>#{a.areteInterno} {a.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Vaca Madre (Matriz de la Finca)</label>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                    value={madre}
                    onChange={e => setMadre(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="">-- Seleccionar Vaca Madre --</option>
                    {animales?.filter(a => a.sexo === 'Hembra').map(a => (
                      <option key={a.id} value={a.id}>#{a.areteInterno} {a.nombre}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Comprado a / Ganadería</label>
                  <input
                    type="text"
                    placeholder="Ej. Subasta Ganadera Esparza"
                    value={compradoA}
                    onChange={(e) => setCompradoA(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Fecha de Compra</label>
                  <input
                    type="date"
                    value={fechaCompra}
                    onChange={(e) => setFechaCompra(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Valor de Compra (CRC ₡)</label>
                  <input
                    type="number"
                    placeholder="Ej. 850000"
                    value={valorCompraCrc}
                    onChange={(e) => setValorCompraCrc(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-navy">Nº Comprobante / Guía</label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-2024-001"
                    value={numeroGuia}
                    onChange={(e) => setNumeroGuia(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-light transition-colors"
            >
              Guardar Genealogía
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
