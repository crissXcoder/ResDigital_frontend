'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAnimales, Animal } from '@/lib/api/animales';
import { getPotreros, asignarAnimalesPotrero, Potrero } from '@/lib/api/potreros';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function AsignarAnimalesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<Set<string>>(new Set());
  const [selectedPotreroId, setSelectedPotreroId] = useState<string>('');

  const { data: animales = [], isLoading: loadingAnimales } = useQuery({
    queryKey: ['animales'],
    queryFn: () => getAnimales(),
  });

  const { data: potreros = [], isLoading: loadingPotreros } = useQuery({
    queryKey: ['potreros'],
    queryFn: () => getPotreros(),
  });

  const mutation = useMutation({
    mutationFn: () => asignarAnimalesPotrero(selectedPotreroId, Array.from(selectedAnimalIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animales'] });
      queryClient.invalidateQueries({ queryKey: ['potreros'] });
      router.push('/potreros');
    }
  });

  const toggleAnimal = (id: string) => {
    const next = new Set(selectedAnimalIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedAnimalIds(next);
  };

  const toggleAll = () => {
    if (selectedAnimalIds.size === animales.length) {
      setSelectedAnimalIds(new Set());
    } else {
      setSelectedAnimalIds(new Set(animales.map(a => a.id)));
    }
  };

  const getStatusPill = (animal: Animal) => {
    const status = animal.tipoBaja || (animal.activo ? 'APTO' : 'INACTIVO');
    let colorClass = 'bg-emerald-100 text-emerald-600 border-emerald-200';
    if (status.includes('RETIRO')) {
      colorClass = 'bg-red-100 text-red-500 border-red-200';
    } else if (status === 'INACTIVO') {
      colorClass = 'bg-slate-100 text-slate-500 border-slate-200';
    }
    return (
      <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${colorClass} uppercase tracking-wider`}>
        {status}
      </span>
    );
  };

  const getRazaDisplay = (animal: Animal) => {
    if (animal.razaOtra) return animal.razaOtra;
    return animal.raza?.nombre || '-';
  };

  return (
    <main className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-navy">Módulo de Potreros</h1>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex justify-between items-end border-b border-slate-200 pb-0">
          <div className="flex space-x-8 px-2">
            <Link href="/potreros" className="pb-3 text-slate-400 font-semibold text-sm cursor-pointer hover:text-slate-600 transition-colors">
              Lista
            </Link>
            <div className="pb-3 border-b-2 border-navy text-navy font-bold text-sm cursor-pointer">
              Asignar Animales
            </div>
          </div>
          <div className="pb-3">
            <Link 
              href="/potreros"
              className="flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-full hover:bg-navy-light transition-colors text-sm font-bold shadow-md"
            >
              <Plus size={18} strokeWidth={3} />
              Nuevo Potrero
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2">
          {/* Left Panel - Seleccionar Animales */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[60vh] max-h-[75vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="font-extrabold text-navy text-lg">Seleccionar Animales para Trasladar</h2>
              <span className="text-sm font-bold text-slate-400">{selectedAnimalIds.size} seleccionados</span>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="border-b border-slate-100">
                    <th className="py-4 px-6 w-12 text-center bg-white">
                      <input 
                        type="checkbox" 
                        checked={selectedAnimalIds.size > 0 && selectedAnimalIds.size === animales.length}
                        ref={input => {
                          if (input) {
                            input.indeterminate = selectedAnimalIds.size > 0 && selectedAnimalIds.size < animales.length;
                          }
                        }}
                        onChange={toggleAll}
                        className="rounded border-slate-300 text-navy focus:ring-navy w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-4 px-6 text-xs font-extrabold text-slate-400 uppercase tracking-wider bg-white">Arete</th>
                    <th className="py-4 px-6 text-xs font-extrabold text-slate-400 uppercase tracking-wider bg-white">Nombre</th>
                    <th className="py-4 px-6 text-xs font-extrabold text-slate-400 uppercase tracking-wider bg-white">Raza</th>
                    <th className="py-4 px-6 text-xs font-extrabold text-slate-400 uppercase tracking-wider bg-white">Potrero Actual</th>
                    <th className="py-4 px-6 text-xs font-extrabold text-slate-400 uppercase tracking-wider text-center bg-white">Estado Sanitario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingAnimales ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-medium">Cargando animales...</td></tr>
                  ) : animales.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-medium">No hay animales registrados.</td></tr>
                  ) : (
                    animales.map(animal => (
                      <tr 
                        key={animal.id} 
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedAnimalIds.has(animal.id) ? 'bg-indigo-50/30' : ''}`}
                        onClick={() => toggleAnimal(animal.id)}
                      >
                        <td className="py-4 px-6 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedAnimalIds.has(animal.id)}
                            onChange={() => {}} // Handled by tr onClick
                            className="rounded border-slate-300 text-navy focus:ring-navy w-4 h-4 pointer-events-none"
                          />
                        </td>
                        <td className="py-4 px-6 font-extrabold text-navy whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                              {animal.fotoUrl ? (
                                <img src={animal.fotoUrl} alt={animal.areteInterno} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">N/A</span>
                              )}
                            </div>
                            <span>#{animal.areteInterno}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-bold text-navy whitespace-nowrap">{animal.nombre || '-'}</td>
                        <td className="py-4 px-6 text-slate-500 font-medium text-sm text-balance max-w-[150px]">{getRazaDisplay(animal)}</td>
                        <td className="py-4 px-6 text-slate-500 font-medium text-sm whitespace-nowrap">{animal.potrero?.nombre || 'Sin asignar'}</td>
                        <td className="py-4 px-6 text-center">
                          {getStatusPill(animal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel - Resumen de Traslado */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-6">
              <h2 className="font-extrabold text-navy text-xl mb-6">Resumen de Traslado</h2>
              
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Animales Seleccionados</p>
                  <p className="text-5xl font-extrabold text-navy">{selectedAnimalIds.size}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Potrero Destino</label>
                  <select
                    value={selectedPotreroId}
                    onChange={e => setSelectedPotreroId(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition-shadow cursor-pointer appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                  >
                    <option value="">— Seleccione potrero —</option>
                    {potreros.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 space-y-3">
                  <button
                    onClick={() => mutation.mutate()}
                    disabled={selectedAnimalIds.size === 0 || !selectedPotreroId || mutation.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-navy hover:bg-navy-light text-white px-5 py-3 rounded-xl transition-colors font-bold disabled:bg-[#94A3B8] disabled:cursor-not-allowed shadow-sm"
                  >
                    {mutation.isPending ? 'Procesando...' : 'Confirmar Traslado'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedAnimalIds(new Set());
                      setSelectedPotreroId('');
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-navy hover:border-slate-300 px-5 py-3 rounded-xl transition-colors font-bold shadow-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
