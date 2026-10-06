'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPotrero, asignarAnimalesPotrero } from '@/lib/api/potreros';
import { getAnimales } from '@/lib/api/animales';
import { ArrowLeft, Check, Search } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function AsignarAnimalesPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: potrero, isLoading: isLoadingPotrero } = useQuery({
    queryKey: ['potrero', id],
    queryFn: () => getPotrero(id),
  });

  const { data: animales = [], isLoading: isLoadingAnimales } = useQuery({
    queryKey: ['animales'],
    queryFn: () => getAnimales(),
  });

  const mutation = useMutation({
    mutationFn: () => asignarAnimalesPotrero(id, Array.from(selectedIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['potrero', id] });
      queryClient.invalidateQueries({ queryKey: ['potreros'] });
      queryClient.invalidateQueries({ queryKey: ['animales'] });
      router.push(`/potreros/${id}`);
    }
  });

  if (isLoadingPotrero || isLoadingAnimales) return <div className="p-8 text-slate-500">Cargando datos...</div>;
  if (!potrero) return <div className="p-8 text-red-500">Potrero no encontrado.</div>;

  // Filter animals: active, matches search, not currently in this potrero (though they could be, let's just show all active and group them)
  const availableAnimales = animales.filter(a => {
    if (!a.activo) return false;
    const matchesSearch = 
      a.areteInterno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.nombre && a.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const toggleSelection = (animalId: string) => {
    const next = new Set(selectedIds);
    if (next.has(animalId)) {
      next.delete(animalId);
    } else {
      next.add(animalId);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === availableAnimales.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableAnimales.map(a => a.id)));
    }
  };

  // Calcular UA a mover
  let selectedUa = 0;
  availableAnimales.forEach(a => {
    if (selectedIds.has(a.id)) {
       selectedUa += ['Vaca', 'Toro', 'Novillo mayor'].includes(a.categoria) ? 1.0 : 0.5;
    }
  });

  const uaFutura = potrero.uaTotal + selectedUa;
  const porcentajeOcupacion = (uaFutura / (potrero.areaHa * potrero.capacidadRecomendadaUaHa)) * 100;

  return (
    <main className="p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2.5 bg-white text-slate-600 rounded-full hover:bg-slate-50 border border-slate-200 shadow-sm transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-navy">Trasladar Animales</h1>
              <p className="text-slate-500 text-sm mt-1">
                Destino: <span className="font-semibold text-slate-700">{potrero.nombre}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main List */}
          <div className="flex-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por arete o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white text-slate-700"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 w-12">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.size > 0 && selectedIds.size === availableAnimales.length}
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 text-navy focus:ring-navy"
                        />
                      </th>
                      <th className="px-6 py-4 font-medium">Arete / Nombre</th>
                      <th className="px-6 py-4 font-medium">Categoría</th>
                      <th className="px-6 py-4 font-medium">Ubicación Actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {availableAnimales.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                          No hay animales disponibles para trasladar.
                        </td>
                      </tr>
                    ) : (
                      availableAnimales.map(animal => (
                        <tr 
                          key={animal.id} 
                          className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedIds.has(animal.id) ? 'bg-navy/5' : ''}`}
                          onClick={() => toggleSelection(animal.id)}
                        >
                          <td className="px-6 py-4">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.has(animal.id)}
                              onChange={() => toggleSelection(animal.id)}
                              onClick={e => e.stopPropagation()}
                              className="rounded border-slate-300 text-navy focus:ring-navy"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-navy">#{animal.areteInterno}</div>
                            <div className="text-slate-500 text-xs">{animal.nombre || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                              {animal.categoria}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {animal.potreroId === potrero.id ? (
                              <span className="text-emerald-600 font-medium">Ya en este potrero</span>
                            ) : (
                              'Otro / Sin asignar'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel Summary */}
          <div className="lg:w-80 space-y-4">
            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm sticky top-6">
              <h3 className="font-bold text-lg text-navy mb-4">Resumen de Traslado</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Animales Sel.</span>
                  <span className="font-semibold text-slate-700">{selectedIds.size}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">UA a mover</span>
                  <span className="font-semibold text-slate-700">+{selectedUa.toFixed(1)}</span>
                </div>
                
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center text-sm mb-1.5">
                    <span className="text-slate-500">Carga Proyectada</span>
                    <span className={`font-semibold ${porcentajeOcupacion > 100 ? 'text-red-600' : 'text-slate-700'}`}>
                      {uaFutura.toFixed(1)} UA
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        porcentajeOcupacion > 100 ? 'bg-red-500' :
                        porcentajeOcupacion > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(porcentajeOcupacion, 100)}%` }}
                    />
                  </div>
                  {porcentajeOcupacion > 100 && (
                    <p className="text-xs text-red-500 mt-2">
                      Advertencia: El traslado superará la capacidad recomendada.
                    </p>
                  )}
                </div>
              </div>

              <button 
                onClick={() => mutation.mutate()}
                disabled={selectedIds.size === 0 || mutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-navy text-white px-5 py-3 rounded-xl hover:bg-navy-light transition-colors text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? 'Procesando...' : (
                  <>
                    <Check size={18} />
                    Confirmar Traslado
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
