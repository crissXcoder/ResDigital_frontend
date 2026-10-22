'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getAnimales, getRazas, type Animal } from '@/lib/api/animales';
import { getPotreros, type Potrero } from '@/lib/api/potreros';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, Plus, MoreVertical, Edit2, ArchiveX, SlidersHorizontal, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { ModalEditarAnimal } from '@/components/modals/ModalEditarAnimal';
import { ModalDarBaja } from '@/components/modals/ModalDarBaja';
import { formatearFecha, hoyLocal, normalizarFechaCivil } from '@/lib/reproductivo/fechas';
import { RequireRole } from '@/components/auth/RequireRole';
import { ESTADOS_HATO, SEXOS, CATEGORIAS_ANIMAL } from '@/lib/api/catalogos';

interface ColumnasConfig {
  raza: boolean;
  edad: boolean;
  estadoReproductivo: boolean;
  potrero: boolean;
}

const DEFAULT_COLUMNAS: ColumnasConfig = {
  raza: true,
  edad: true,
  estadoReproductivo: true,
  potrero: true,
};

const STORAGE_KEY_COLUMNAS = 'resdigital_hato_columnas';

function HatoContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('buscar') || searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState({ query: queryParam, value: queryParam });
  const searchTerm = searchInput.query === queryParam ? searchInput.value : queryParam;
  const [filterRaza, setFilterRaza] = useState('');
  const [filterEstadoHato, setFilterEstadoHato] = useState('');
  const [filterSexo, setFilterSexo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterPotrero, setFilterPotrero] = useState('');

  const [columnas, setColumnas] = useState<ColumnasConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_COLUMNAS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLUMNAS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return { ...DEFAULT_COLUMNAS, ...parsed };
        }
      }
    } catch {
      // Ignorar fallos de almacenamiento en entornos restringidos
    }
    return DEFAULT_COLUMNAS;
  });
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [bajaAnimal, setBajaAnimal] = useState<Animal | null>(null);

  const actualizarColumna = (key: keyof ColumnasConfig, valor: boolean) => {
    setColumnas((prev) => {
      const next = { ...prev, [key]: valor };
      try {
        localStorage.setItem(STORAGE_KEY_COLUMNAS, JSON.stringify(next));
      } catch {
        // Ignorar
      }
      return next;
    });
  };

  const aplicarPreset = (tipo: 'basica' | 'completa') => {
    const next: ColumnasConfig = tipo === 'basica'
      ? { raza: false, edad: false, estadoReproductivo: false, potrero: false }
      : { raza: true, edad: true, estadoReproductivo: true, potrero: true };
    setColumnas(next);
    try {
      localStorage.setItem(STORAGE_KEY_COLUMNAS, JSON.stringify(next));
    } catch {
      // Ignorar
    }
  };

  const { data: animales = [], isLoading, error } = useQuery({
    queryKey: ['animales'],
    queryFn: () => getAnimales(),
  });

  const { data: razas = [] } = useQuery({
    queryKey: ['razas'],
    queryFn: () => getRazas(),
  });

  const { data: potreros = [] } = useQuery({
    queryKey: ['potreros'],
    queryFn: () => getPotreros(),
  });

  // Cerrar dropdown al hacer click fuera
  const closeDropdown = () => setActiveDropdownId(null);

  const hayFiltrosActivos = Boolean(
    searchTerm.trim() ||
    filterRaza ||
    filterEstadoHato ||
    filterSexo ||
    filterCategoria ||
    filterPotrero
  );

  const limpiarFiltros = () => {
    setSearchInput({ query: '', value: '' });
    setFilterRaza('');
    setFilterEstadoHato('');
    setFilterSexo('');
    setFilterCategoria('');
    setFilterPotrero('');
  };

  const filteredAnimales = animales.filter((animal) => {
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

    // Filter by status (estado en hato: activo o motivo de baja)
    const estadoHato = animal.activo ? 'Activo' : (animal.tipoBaja || 'Inactivo');
    const matchesEstadoHato = filterEstadoHato === '' || estadoHato.toLowerCase() === filterEstadoHato.toLowerCase();

    // Filter by sexo
    const matchesSexo = filterSexo === '' || (animal.sexo || '').toLowerCase() === filterSexo.toLowerCase();

    // Filter by categoría
    const matchesCategoria = filterCategoria === '' || (animal.categoria || '').toLowerCase() === filterCategoria.toLowerCase();

    // Filter by potrero
    const matchesPotrero =
      filterPotrero === '' ||
      animal.potreroId === filterPotrero ||
      animal.potrero?.id === filterPotrero;

    return Boolean(matchesSearch && matchesRaza && matchesEstadoHato && matchesSexo && matchesCategoria && matchesPotrero);
  });

  const visibleColumnCount =
    6 +
    (columnas.raza ? 1 : 0) +
    (columnas.edad ? 1 : 0) +
    (columnas.estadoReproductivo ? 1 : 0) +
    (columnas.potrero ? 1 : 0);

  return (
    <main className="p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Top Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-navy">Hato ganadero</h1>
          <RequireRole roles={['propietario', 'administrador']}><Link
            href="/hato/nuevo"
            className="flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-full hover:bg-navy-light transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus size={18} />
            Nuevo animal
          </Link></RequireRole>
        </div>

        {/* Filters and Search */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por arete (#104), nombre o raza..."
                value={searchTerm}
                onChange={(e) => setSearchInput({ query: queryParam, value: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light bg-white text-slate-700"
              />
            </div>

            {/* Column Config Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnMenuOpen(!columnMenuOpen)}
                aria-label="Configurar columnas visibles"
                aria-expanded={columnMenuOpen}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium shadow-sm"
              >
                <SlidersHorizontal size={16} className="text-slate-500" />
                <span>Columnas</span>
              </button>

              {columnMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setColumnMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30 animate-in fade-in slide-in-from-top-2 text-xs">
                    <div className="font-bold text-navy pb-2 border-b border-slate-100 flex items-center justify-between">
                      <span>Columnas visibles</span>
                      <span className="text-[10px] text-slate-400 font-normal">Básicas fijas</span>
                    </div>
                    <div className="py-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => aplicarPreset('basica')}
                        className="flex-1 py-1 px-2 text-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                      >
                        Vista básica
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarPreset('completa')}
                        className="flex-1 py-1 px-2 text-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                      >
                        Vista completa
                      </button>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={columnas.raza}
                          onChange={(e) => actualizarColumna('raza', e.target.checked)}
                          className="rounded border-slate-300 text-navy focus:ring-navy"
                        />
                        <span className="text-slate-700">Raza / híbrido</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={columnas.edad}
                          onChange={(e) => actualizarColumna('edad', e.target.checked)}
                          className="rounded border-slate-300 text-navy focus:ring-navy"
                        />
                        <span className="text-slate-700">Nacimiento / edad</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={columnas.estadoReproductivo}
                          onChange={(e) => actualizarColumna('estadoReproductivo', e.target.checked)}
                          className="rounded border-slate-300 text-navy focus:ring-navy"
                        />
                        <span className="text-slate-700">Estado reproductivo</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={columnas.potrero}
                          onChange={(e) => actualizarColumna('potrero', e.target.checked)}
                          className="rounded border-slate-300 text-navy focus:ring-navy"
                        />
                        <span className="text-slate-700">Potrero</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <select
              aria-label="Filtrar por raza"
              value={filterRaza}
              onChange={(e) => setFilterRaza(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-light truncate"
            >
              <option value="">Todas las razas</option>
              {razas.map(raza => (
                <option key={raza.id} value={raza.nombre.toLowerCase()}>
                  {raza.nombre}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por estado en hato"
              value={filterEstadoHato}
              onChange={(e) => setFilterEstadoHato(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-light truncate"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_HATO.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por sexo"
              value={filterSexo}
              onChange={(e) => setFilterSexo(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-light truncate"
            >
              <option value="">Todos los sexos</option>
              {SEXOS.map((sexo) => (
                <option key={sexo} value={sexo}>
                  {sexo}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por categoría"
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-light truncate"
            >
              <option value="">Todas las categorías</option>
              {CATEGORIAS_ANIMAL.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por potrero"
              value={filterPotrero}
              onChange={(e) => setFilterPotrero(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-light truncate col-span-2 sm:col-span-1"
            >
              <option value="">Todos los potreros</option>
              {potreros.map((pot) => (
                <option key={pot.id} value={pot.id}>
                  {pot.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Indicator & Reset bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
            <span data-testid="contador-animales" className="font-medium text-slate-600">
              Mostrando <span className="font-bold text-navy">{filteredAnimales.length}</span> de <span className="font-bold text-navy">{animales.length}</span> {animales.length === 1 ? 'animal' : 'animales'}
              {hayFiltrosActivos && ' (filtrado)'}
            </span>
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                <RotateCcw size={13} />
                Restablecer filtros
              </button>
            )}
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
                  {columnas.raza && <th className="px-6 py-4">Raza / híbrido</th>}
                  {columnas.edad && <th className="px-6 py-4">Nacimiento / edad</th>}
                  <th className="px-6 py-4">Categoría</th>
                  {columnas.estadoReproductivo && <th className="px-6 py-4">Estado reproductivo</th>}
                  <th className="px-6 py-4 text-center">Estado en hato</th>
                  {columnas.potrero && <th className="px-6 py-4">Potrero</th>}
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={visibleColumnCount} className="text-center py-12 text-slate-500 font-medium">Cargando inventario...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={visibleColumnCount} className="text-center py-12 text-danger font-medium">Error al cargar los animales</td>
                  </tr>
                ) : filteredAnimales.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumnCount} className="text-center py-12 text-slate-500 font-medium">
                      <div className="space-y-2">
                        <p>No se encontraron animales con los filtros seleccionados.</p>
                        {hayFiltrosActivos && (
                          <button
                            type="button"
                            onClick={limpiarFiltros}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <RotateCcw size={14} />
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    </td>
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
                        {animal.numeroOficialDiio && (
                          <div className="text-[11px] text-blue-600 font-medium">
                            DIIO: {animal.numeroOficialDiio}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-navy">{animal.nombre || 'Sin nombre'}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{animal.sexo || 'Hembra'}</div>
                      </td>
                      {columnas.raza && (
                        <td className="px-6 py-4 text-slate-600 text-xs max-w-[150px] truncate">
                          {animal.razaOtra ? `Otra (${animal.razaOtra})` : animal.raza?.nombre || 'Desconocida'}
                        </td>
                      )}
                      {columnas.edad && (
                        <td className="px-6 py-4">
                          <div className="text-slate-600 text-xs">{animal.fechaNacimiento ? formatearFecha(animal.fechaNacimiento) : 'N/A'}</div>
                          <div className="text-blue-500 text-xs font-semibold mt-0.5">
                            {(() => {
                              if (!animal.fechaNacimiento) return '-';
                              const fechaNacimiento = normalizarFechaCivil(animal.fechaNacimiento);
                              if (!fechaNacimiento) return '-';
                              const [anioNacimiento, mesNacimiento, diaNacimiento] = fechaNacimiento.split('-').map(Number);
                              const [anioHoy, mesHoy, diaHoy] = hoyLocal().split('-').map(Number);
                              let years = anioHoy - anioNacimiento;
                              let months = mesHoy - mesNacimiento;

                              const diaLimiteMes = Math.min(
                                diaNacimiento,
                                new Date(Date.UTC(anioHoy, mesHoy, 0)).getUTCDate(),
                              );
                              if (months < 0 || (months === 0 && diaHoy < diaLimiteMes)) {
                                years--;
                                months += 12;
                              }
                              if (diaHoy < diaLimiteMes) months--;
                              if (months < 0) months += 12;
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
                      )}
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {animal.categoria || 'Vaca Adulta'}
                      </td>
                      {columnas.estadoReproductivo && (
                        <td className="px-6 py-4 text-slate-600 text-xs">
                          {animal.sexo === 'Hembra' ? (
                            <StatusBadge status="Sin Diagnóstico" />
                          ) : (
                            <span className="text-slate-400 font-medium">N/A</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={animal.activo ? 'Activo' : (animal.tipoBaja || 'Inactivo')} />
                      </td>
                      {columnas.potrero && (
                        <td className="px-6 py-4 text-slate-600 text-xs">
                          {animal.potrero?.nombre || 'Potrero #1'}
                        </td>
                      )}
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
                                  <Edit2 size={16} /> Editar datos
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
