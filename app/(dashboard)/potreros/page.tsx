'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPotreros } from '@/lib/api/potreros';
import { Plus } from 'lucide-react';
import { FormPotrero } from './components/FormPotrero';
import Link from 'next/link';
import { RequireRole } from '@/components/auth/RequireRole';

export default function PotrerosPage() {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPotrero, setEditingPotrero] = useState<any>(null);

  const { data: potreros = [], isLoading } = useQuery({
    queryKey: ['potreros'],
    queryFn: () => getPotreros(),
  });

  const totalPotreros = potreros.length;
  const hectareasTotales = potreros.reduce((sum, p) => sum + Number(p.areaHa || 0), 0);
  const cargaPromedio = totalPotreros > 0 
    ? (potreros.reduce((sum, p) => sum + Number(p.cargaActualUaHa || 0), 0) / totalPotreros).toFixed(1) 
    : '0.0';
  const alertasActivas = potreros.filter(p => p.estadoCalculado === 'SOBRECARGADO').length;

  const countByStatus = (status: string) => potreros.filter(p => p.estadoCalculado === status).length;

  const filters = [
    { label: 'Todos', count: totalPotreros },
    { label: 'Disponibles', count: countByStatus('DISPONIBLE') },
    { label: 'En Recuperación', count: countByStatus('EN RECUPERACIÓN') },
    { label: 'Descanso Programado', count: countByStatus('EN MANTENIMIENTO') }, // Asumiendo EN MANTENIMIENTO = Descanso
    { label: 'Sobrecargados', count: countByStatus('SOBRECARGADO') },
  ];

  const filteredPotreros = potreros.filter(p => {
    if (activeFilter === 'Todos') return true;
    if (activeFilter === 'Disponibles') return p.estadoCalculado === 'DISPONIBLE';
    if (activeFilter === 'En Recuperación') return p.estadoCalculado === 'EN RECUPERACIÓN';
    if (activeFilter === 'Descanso Programado') return p.estadoCalculado === 'EN MANTENIMIENTO';
    if (activeFilter === 'Sobrecargados') return p.estadoCalculado === 'SOBRECARGADO';
    return true;
  });

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'DISPONIBLE': 
        return { pill: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-500' };
      case 'EN RECUPERACIÓN': 
        return { pill: 'bg-amber-100 text-amber-800 border-amber-200', bar: 'bg-amber-500' };
      case 'SOBRECARGADO': 
        return { pill: 'bg-red-100 text-red-800 border-red-200', bar: 'bg-red-500' };
      case 'EN MANTENIMIENTO': 
        return { pill: 'bg-blue-100 text-blue-800 border-blue-200', bar: 'bg-blue-500' };
      default: 
        return { pill: 'bg-slate-100 text-slate-800 border-slate-200', bar: 'bg-slate-500' };
    }
  };

  const handleEdit = (potrero: any) => {
    setEditingPotrero(potrero);
    setIsFormOpen(true);
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
            <div className="pb-3 border-b-2 border-navy text-navy font-bold text-sm cursor-pointer">
              Lista
            </div>
            <RequireRole roles={['propietario', 'administrador', 'peon']}><Link href="/potreros/asignar" className="pb-3 text-slate-400 font-semibold text-sm cursor-pointer hover:text-slate-600 transition-colors">
              Asignar Animales
            </Link></RequireRole>
          </div>
          <RequireRole roles={['propietario', 'administrador']}><div className="pb-3">
            <button 
              onClick={() => {
                setEditingPotrero(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-full hover:bg-navy-light transition-colors text-sm font-bold shadow-md"
            >
              <Plus size={18} strokeWidth={3} />
              Nuevo Potrero
            </button>
          </div></RequireRole>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Potreros</p>
            <p className="text-3xl font-extrabold text-navy">
              {totalPotreros} <span className="text-lg text-navy/70">({hectareasTotales.toFixed(1)} ha)</span>
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hectáreas Totales</p>
            <p className="text-3xl font-extrabold text-emerald-500">{hectareasTotales.toFixed(1)} ha</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Carga Promedio</p>
            <p className="text-3xl font-extrabold text-amber-500">{cargaPromedio} UA/ha</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alertas Activas</p>
            <p className="text-3xl font-extrabold text-red-500">{alertasActivas}</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          {filters.map(filter => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(filter.label)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                activeFilter === filter.label 
                  ? 'bg-navy text-white border-transparent' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Table Area */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Potrero</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Área</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Pasto</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Animales Asignados</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Carga Animal (UA/Ha)</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Días de Descanso</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-400 font-medium">
                      Cargando potreros...
                    </td>
                  </tr>
                ) : filteredPotreros.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-400 font-medium">
                      No se encontraron potreros en esta categoría.
                    </td>
                  </tr>
                ) : (
                  filteredPotreros.map(potrero => {
                    const uaPercentage = Math.min((potrero.cargaActualUaHa / (potrero.capacidadRecomendadaUaHa || 1)) * 100, 100);
                    const statusStyles = getStatusStyle(potrero.estadoCalculado);
                    
                    return (
                      <tr key={potrero.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-extrabold text-navy text-sm">{potrero.nombre}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700">{potrero.areaHa}</span>
                            <span className="text-xs font-medium text-slate-400">ha</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-slate-500">{potrero.tipoPasto || 'No especificado'}</span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm">
                            <span className="font-extrabold text-navy">{potrero.animalesAsignadosCount || 0}</span>
                            <span className="text-slate-400 font-medium ml-1">animales</span>
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${statusStyles.bar}`} style={{ width: `${uaPercentage}%` }}></div>
                            </div>
                            <span className="text-sm font-extrabold text-navy">{potrero.cargaActualUaHa?.toFixed(1)} UA/ha</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: '80%' }}></div>
                            </div>
                            <span className="text-sm font-bold text-emerald-500">45d</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center justify-center px-3 py-1 text-xs font-extrabold uppercase border rounded-md ${statusStyles.pill}`}>
                            {potrero.estadoCalculado}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link 
                              href={`/potreros/${potrero.id}`}
                              className="px-4 py-2 bg-navy text-white text-xs font-bold rounded-lg hover:bg-navy-light transition-colors shadow-sm"
                            >
                              Ver Detalle
                            </Link>
                            <RequireRole roles={['propietario', 'administrador']}><button
                              onClick={() => handleEdit(potrero)}
                              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                            >
                              Editar
                            </button></RequireRole>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {isFormOpen && (
        <FormPotrero 
          onClose={() => {
            setIsFormOpen(false);
            setEditingPotrero(null);
          }} 
          potrero={editingPotrero}
        />
      )}
    </main>
  );
}
