'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getAnimales, getRazas } from '@/lib/api/animales';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, Plus, MoreVertical, Edit2, ArchiveX } from 'lucide-react';
import Link from 'next/link';
import { ModalEditarAnimal } from '@/components/modals/ModalEditarAnimal';
import { ModalDarBaja } from '@/components/modals/ModalDarBaja';
import { RequireRole } from '@/components/auth/RequireRole';

function HatoContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('buscar') || searchParams.get('search') || '';

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [filterRaza, setFilterRaza] = useState('');
  const [filterSanitario, setFilterSanitario] = useState('');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editingAnimal, setEditingAnimal] = useState<any | null>(null);
  const [bajaAnimal, setBajaAnimal] = useState<any | null>(null);

  // Sincronizar término de búsqueda si cambia la URL
  useEffect(() => {
    if (queryParam) {
      setSearchTerm(queryParam);
    }
  }, [queryParam]);
  
  const { data: animales = [], isLoading, error } = useQuery({
    queryKey: ['animales'],
    queryFn: () => getAnimales(),
  });

  const { data: razas = [] } = useQuery({
    queryKey: ['razas'],
    queryFn: () => getRazas(),
  });

  // Cerrar dropdown al hacer click fuera (simple hack with an overlay)
  const closeDropdown = () => setActiveDropdownId(null);

  const filteredAnimales = animales.filter(animal => {
    // Filter by search term (soporta #506, 506, DIIO y nombre)
    const cleanSearch = searchTerm.replace(/^#/, '').trim().toLowerCase();
    const rawSearch = searchTerm.trim().toLowerCase();
    const arete = (animal.areteInterno || '').toLowerCase();
    const diio = (animal.numeroOficialDiio || '').toLowerCase();
    const nombre = (animal.nombre || '').toLowerCase();

    const matchesSearch = 
      !cleanSearch ||
      arete.includes(cleanSearch) ||
      `#${arete}`.includes(rawSearch) ||
      diio.includes(cleanSearch) ||
      nombre.includes(cleanSearch);

    // Filter by raza
    const searchRaza = filterRaza.toLowerCase();
    const razaName = (animal.razaOtra || animal.raza?.nombre || '').toLowerCase();
    const matchesRaza = filterRaza === '' || razaName.includes(searchRaza);

    // Filter by status (sanitario/activo)
    const statusLabel = animal.activo ? 'Apto' : (animal.tipoBaja || 'Inactivo');
    const matchesSanitario = filterSanitario === '' || statusLabel.toLowerCase() === filterSanitario.toLowerCase();

    return Boolean(matchesSearch && matchesRaza && matchesSanitario);
  });

  return (
    <main className="p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Top Actions (simulating top bar) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-navy">Hato Ganadero</h1>
          <RequireRole roles={['propietario', 'administrador']}><Link
            href="/hato/nuevo" 
            className="flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-full hover:bg-navy-light transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus size={18} />
            Nuevo Animal
          </Link></RequireRole>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por arete (#104), nombre o raza..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white text-slate-700"
            />
          </div>
          <div className="flex gap-3">
            <select 
              value={filterRaza}
              onChange={(e) => setFilterRaza(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-light min-w-[160px]"
            >
              <option value="">Todas las razas</option>
              {razas.map(raza => (
                <option key={raza.id} value={raza.nombre.toLowerCase()}>
                  {raza.nombre}
                </option>
              ))}
            </select>
            <select 
              value={filterSanitario}
              onChange={(e) => setFilterSanitario(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-light min-w-[160px]"
            >
              <option value="">Todo estado sanitario</option>
              <option value="Apto">Apto</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Fallecimiento">Fallecimiento</option>
              <option value="Venta Comercial">Venta Comercial</option>
              <option value="Descarte">Descarte</option>
              <option value="Traslado">Traslado</option>
            </select>
          </div>
        </div>

        {/* Table Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className={`overflow-x-auto ${activeDropdownId ? 'pb-24' : ''}`}>
            <table className="w-full text-left text-sm text-slate-700 whitespace-nowrap">
              <thead className="bg-white border-b border-slate-200 uppercase text-[10px] tracking-wider text-slate-400 font-bold">
                <tr>
                  <th className="px-6 py-4">Foto</th>
                  <th className="px-6 py-4">Arete #</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Raza / Híbrido</th>
                  <th className="px-6 py-4">Nacimiento / Edad</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Estado Repro</th>
                  <th className="px-6 py-4 text-center">Estado Sanitario</th>
                  <th className="px-6 py-4">Potrero</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-500 font-medium">Cargando inventario...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-danger font-medium">Error al cargar los animales</td>
                  </tr>
                ) : filteredAnimales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-500 font-medium">No se encontraron animales.</td>
                  </tr>
                ) : (
                  filteredAnimales.map((animal) => (
                    <tr key={animal.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        {animal.fotoUrl ? (
                          <img src={animal.fotoUrl} alt="Foto" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 text-xl">
                            🐄
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-navy text-base">#{animal.areteInterno}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-navy">{animal.nombre || 'Sin nombre'}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{animal.sexo || 'Hembra'}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs max-w-[150px] truncate">
                        {animal.razaOtra ? `Otra (${animal.razaOtra})` : animal.raza?.nombre || 'Desconocida'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600 text-xs">{animal.fechaNacimiento ? new Date(animal.fechaNacimiento).toLocaleDateString() : 'N/A'}</div>
                        <div className="text-blue-500 text-xs font-semibold mt-0.5">
                          {(() => {
                            if (!animal.fechaNacimiento) return '-';
                            const birth = new Date(animal.fechaNacimiento);
                            const now = new Date();
                            
                            let years = now.getFullYear() - birth.getFullYear();
                            let months = now.getMonth() - birth.getMonth();

                            if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
                              years--;
                              months += 12;
                            }
                            
                            if (years > 0) {
                              return `${years} año${years !== 1 ? 's' : ''}`;
                            } else if (months > 0) {
                              return `${months} mes${months !== 1 ? 'es' : ''}`;
                            } else {
                              return 'Menos de 1 mes';
                            }
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {animal.categoria || 'Vaca Adulta'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {animal.sexo === 'Hembra' ? 'Preñada' : 'N/A'} {/* Mocked for UI accuracy */}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={animal.activo ? 'Apto' : (animal.tipoBaja || 'Inactivo')} />
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {animal.potrero?.nombre || 'Potrero #1'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/hato/${animal.id}`} className="px-4 py-1.5 bg-navy text-white text-xs font-semibold rounded-full hover:bg-navy-light transition-colors shadow-sm">
                            Expediente
                          </Link>
                          
                          <RequireRole roles={['propietario', 'administrador']}><div className="relative">
                            <button 
                              onClick={() => setActiveDropdownId(activeDropdownId === animal.id ? null : animal.id)}
                              className="p-1.5 text-slate-400 hover:text-navy border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>
                            
                            {activeDropdownId === animal.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-10 animate-in fade-in slide-in-from-top-2">
                                <button 
                                  onClick={() => {
                                    setEditingAnimal(animal);
                                    closeDropdown();
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Edit2 size={16} /> Editar Datos
                                </button>
                                <button 
                                  onClick={() => {
                                    setBajaAnimal(animal);
                                    closeDropdown();
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <ArchiveX size={16} /> Dar de baja
                                </button>
                              </div>
                            )}
                          </div></RequireRole>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {activeDropdownId && (
        <div className="fixed inset-0 z-0" onClick={closeDropdown} />
      )}

      <ModalEditarAnimal 
        isOpen={!!editingAnimal}
        onClose={() => setEditingAnimal(null)}
        animal={editingAnimal}
      />

      <ModalDarBaja
        isOpen={!!bajaAnimal}
        onClose={() => setBajaAnimal(null)}
        animal={bajaAnimal}
      />
    </main>
  );
}

export default function HatoPage() {
  return (
    <Suspense
      fallback={
        <main className="p-6 md:p-8">
          <div className="max-w-[1400px] mx-auto text-slate-500 font-medium">
            Cargando inventario del hato...
          </div>
        </main>
      }
    >
      <HatoContent />
    </Suspense>
  );
}

