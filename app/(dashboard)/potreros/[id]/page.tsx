'use client';

import type { Animal } from '@/lib/api/animales';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPotrero, getMovimientosPotrero } from '@/lib/api/potreros';
import { ArrowLeft, Edit2, Plus, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormPotrero } from '../components/FormPotrero';
import { diferenciaDiasCivil, hoyLocal, formatearFecha } from '@/lib/reproductivo/fechas';
import { RequireRole } from '@/components/auth/RequireRole';

export default function PotreroDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: potrero, isLoading } = useQuery({
    queryKey: ['potrero', id],
    queryFn: () => getPotrero(id),
  });

  const { data: movimientos = [], isLoading: loadingMovimientos } = useQuery({
    queryKey: ['potrero-movimientos', id],
    queryFn: () => getMovimientosPotrero(id),
  });

  if (isLoading) return <div className="p-8 text-slate-500 font-medium">Cargando potrero...</div>;
  if (!potrero) return <div className="p-8 text-red-500 font-medium">Potrero no encontrado.</div>;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'DISPONIBLE': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'EN RECUPERACIÓN': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'SOBRECARGADO': return 'bg-red-100 text-red-500 border-red-200';
      case 'EN MANTENIMIENTO': return 'bg-blue-100 text-blue-600 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getDaysSince = () => {
    if (!potrero.fechaUltimoIngreso) return 0;
    return diferenciaDiasCivil(potrero.fechaUltimoIngreso, hoyLocal()) ?? 0;
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
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${colorClass} uppercase tracking-wider`}>
        {status}
      </span>
    );
  };

  const daysSince = getDaysSince();
  const recommended = potrero.diasDescansoRecomendados || 1;
  const percentage = Math.min(100, Math.max(0, (daysSince / recommended) * 100));
  
  // SVG Ring calculation
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

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
              Detalle
            </div>
            <RequireRole roles={['propietario', 'administrador', 'peon']}><Link href="/potreros/asignar" className="pb-3 text-slate-400 font-semibold text-sm cursor-pointer hover:text-slate-600 transition-colors">
              Asignar Animales
            </Link></RequireRole>
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

        {/* Sub Header (Volver y Acciones) */}
        <div className="flex justify-between items-center pt-2">
          <Link href="/potreros" className="flex items-center gap-2 text-slate-400 hover:text-navy font-semibold text-sm transition-colors">
            <ArrowLeft size={16} strokeWidth={2.5} />
            Volver a Lista
          </Link>
          
          <div className="flex gap-3">
            <RequireRole roles={['propietario', 'administrador']}>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-navy hover:border-slate-300 font-bold text-sm rounded-xl transition-colors shadow-sm"
            >
              Editar Potrero
            </button>
            </RequireRole>
            <RequireRole roles={['propietario', 'administrador', 'peon']}>
            <Link 
              href="/potreros/asignar"
              className="px-5 py-2.5 bg-navy text-white hover:bg-navy-light font-bold text-sm rounded-xl transition-colors shadow-sm"
            >
              Mover Animales
            </Link>
            </RequireRole>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Card: Detalle del Potrero */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-extrabold text-navy">{potrero.nombre}</h2>
                <p className="text-slate-500 font-medium mt-1">
                  {potrero.tipoPasto || 'Sin pasto'} &middot; {potrero.areaHa} ha
                </p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(potrero.estadoCalculado)}`}>
                {potrero.estadoCalculado}
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Días de Descanso Block */}
              <div className="w-full md:w-1/3 bg-[#eefaf2] rounded-3xl p-6 flex flex-col items-center justify-center shrink-0 border border-emerald-100">
                <div className="relative w-[120px] h-[120px] flex items-center justify-center mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle 
                      cx="50" cy="50" r={radius}
                      fill="transparent"
                      stroke="#d1fae5" /* emerald-100 */
                      strokeWidth="10"
                    />
                    {/* Progress circle */}
                    <circle 
                      cx="50" cy="50" r={radius}
                      fill="transparent"
                      stroke="#10b981" /* emerald-500 */
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-[#059669]">{daysSince}d</span>
                    <span className="text-[10px] font-bold text-[#10b981]">/ {recommended}d</span>
                  </div>
                </div>
                <span className="text-[#059669] font-bold text-sm">Días de descanso</span>
              </div>

              {/* Data Grid */}
              <div className="w-full grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Área</p>
                  <p className="text-lg font-bold text-navy">{potrero.areaHa} ha</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Animales</p>
                  <p className="text-lg font-bold text-navy">{potrero.animalesAsignadosCount}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Pasto</p>
                  <p className="text-lg font-bold text-navy truncate" title={potrero.tipoPasto || '-'}>{potrero.tipoPasto || '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Fuente de Agua</p>
                  <p className="text-lg font-bold text-navy truncate" title={potrero.fuenteAgua || '-'}>{potrero.fuenteAgua || '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Cap. Máxima</p>
                  <p className="text-lg font-bold text-navy">{potrero.areaHa * potrero.capacidadRecomendadaUaHa} UA</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Carga Actual</p>
                  <p className="text-lg font-bold text-navy">{potrero.cargaActualUaHa.toFixed(1)} UA/ha</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Animales & Rotación */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col h-full">
            <h3 className="font-extrabold text-navy text-lg mb-6">Animales Asignados ({potrero.animales?.length || 0})</h3>
            
            {/* Animales List */}
            <div className="flex-1 overflow-y-auto max-h-[250px] mb-8 space-y-4 pr-2">
              {!potrero.animales || potrero.animales.length === 0 ? (
                <div className="text-slate-400 text-sm font-medium py-4 text-center">No hay animales asignados.</div>
              ) : (
                potrero.animales.map(animal => (
                  <div key={animal.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img 
                          src={animal.fotoUrl || `https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80`} 
                          alt={animal.areteInterno} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <p className="font-extrabold text-navy text-sm">
                          #{animal.areteInterno} {animal.nombre || ''}
                        </p>
                        <p className="text-slate-400 text-xs font-medium">
                          {animal.raza?.nombre || animal.razaOtra || 'Sin raza'} {animal.pesoActualKg ? `· ${animal.pesoActualKg}kg` : ''}
                        </p>
                      </div>
                    </div>
                    {getStatusPill(animal)}
                  </div>
                ))
              )}
            </div>

            {/* Linea de rotación */}
            <div className="mt-auto">
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-4">Línea de Rotación</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy"></div>
                    <span className="text-slate-500 font-medium">Estado actual</span>
                  </div>
                  <span className="text-slate-600 font-bold capitalize">{potrero.estadoCalculado.toLowerCase()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy"></div>
                    <span className="text-slate-500 font-medium">Días de descanso actuales</span>
                  </div>
                  <span className="text-slate-600 font-bold">{daysSince}d</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy"></div>
                    <span className="text-slate-500 font-medium">Descanso recomendado</span>
                  </div>
                  <span className="text-slate-600 font-bold">{recommended}d</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Historial de Movimientos de Potrero */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-extrabold text-navy">Historial de Movimientos</h3>
              <p className="text-sm text-slate-500 font-medium">
                Trazabilidad cronológica de entradas y salidas registradas en este potrero.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3.5 py-1.5 rounded-full self-start sm:self-auto">
              {movimientos.length} movimiento(s)
            </span>
          </div>

          {loadingMovimientos ? (
            <div className="p-8 text-center text-slate-400 font-medium">Cargando historial de movimientos...</div>
          ) : movimientos.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
              No hay movimientos históricos registrados para este potrero.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 px-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Fecha</th>
                    <th className="py-3 px-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Tipo</th>
                    <th className="py-3 px-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Animal</th>
                    <th className="py-3 px-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Origen / Destino</th>
                    <th className="py-3 px-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimientos.map((m) => {
                    const esIngreso = m.tipo === 'INGRESO';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-navy text-sm whitespace-nowrap">
                          {formatearFecha(m.fechaEvento)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              esIngreso
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}
                          >
                            {m.tipo}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-extrabold text-navy text-sm">
                            #{m.animal?.areteInterno || '—'}
                          </span>{' '}
                          <span className="text-slate-500 font-medium text-sm">
                            {m.animal?.nombre || ''}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-slate-600 whitespace-nowrap">
                          {esIngreso ? (
                            <span>
                              Desde:{' '}
                              <strong className="text-navy">
                                {m.potreroOrigen?.nombre || 'Sin potrero previo'}
                              </strong>
                            </span>
                          ) : (
                            <span>
                              Hacia:{' '}
                              <strong className="text-navy">{m.potreroDestino?.nombre}</strong>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-sm text-slate-500">
                          {m.motivo || 'Rotación regular'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      
      {isFormOpen && (
        <FormPotrero potrero={potrero} onClose={() => {
          setIsFormOpen(false);
          // Opcional: router.refresh() para actualizar datos si form editó
        }} />
      )}
    </main>
  );
}
