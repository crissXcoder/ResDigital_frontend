"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  X,
  ChevronRight,
  RotateCcw,
  Download,
  Loader2,
  ExternalLink,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Animal } from "@/lib/api/animales";
import { descargarExpedientePdfPorId } from "@/lib/reportes/expediente-pdf";

interface SelectorAnimalReporteProps {
  animales: Animal[];
  isLoading?: boolean;
  selectedAnimalId?: string;
  nombreFinca?: string;
  onSelectAnimal?: (animal: Animal | null) => void;
}

const MAX_DISPLAY_RESULTS = 50;

/**
 * Selector con autocompletado y búsqueda en tiempo real para hatos extensos.
 * Permite descargar directamente el PDF del expediente sin forzar la redirección a otra vista.
 */
export function SelectorAnimalReporte({
  animales,
  isLoading = false,
  selectedAnimalId = "",
  nombreFinca,
  onSelectAnimal,
}: SelectorAnimalReporteProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelectedId, setInternalSelectedId] = useState(selectedAnimalId);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar selección externa si cambia
  const [prevSelectedAnimalId, setPrevSelectedAnimalId] = useState(selectedAnimalId);
  if (prevSelectedAnimalId !== selectedAnimalId) {
    setPrevSelectedAnimalId(selectedAnimalId);
    setInternalSelectedId(selectedAnimalId);
  }

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const animalSeleccionado = useMemo(() => {
    return animales.find((a) => a.id === internalSelectedId) || null;
  }, [animales, internalSelectedId]);

  // Filtrado optimizado multi-criterio: arete, nombre, DIIO y categoría
  const filteredAnimales = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return animales;

    // Remover posibles prefijos '#' que el usuario escriba por costumbre
    const cleanQ = q.startsWith("#") ? q.slice(1).trim() : q;

    return animales.filter((a) => {
      const matchArete = a.areteInterno.toLowerCase().includes(cleanQ);
      const matchNombre = a.nombre ? a.nombre.toLowerCase().includes(cleanQ) : false;
      const matchDiio = a.numeroOficialDiio ? a.numeroOficialDiio.toLowerCase().includes(cleanQ) : false;
      const matchCategoria = a.categoria ? a.categoria.toLowerCase().includes(cleanQ) : false;
      const matchRaza = a.raza?.nombre ? a.raza.nombre.toLowerCase().includes(cleanQ) : false;

      return matchArete || matchNombre || matchDiio || matchCategoria || matchRaza;
    });
  }, [animales, query]);

  const visibleAnimales = useMemo(() => {
    return filteredAnimales.slice(0, MAX_DISPLAY_RESULTS);
  }, [filteredAnimales]);

  const handleSelect = (animal: Animal) => {
    setInternalSelectedId(animal.id);
    onSelectAnimal?.(animal);
    setIsOpen(false);
    setQuery("");
    setDownloadError(null);
  };

  const handleClearSelection = () => {
    setInternalSelectedId("");
    onSelectAnimal?.(null);
    setQuery("");
    setDownloadError(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleDescargarPdf = async () => {
    if (!animalSeleccionado || isDownloading) return;
    try {
      setIsDownloading(true);
      setDownloadError(null);
      await descargarExpedientePdfPorId(animalSeleccionado.id, nombreFinca);
    } catch (error) {
      console.error("Error al generar PDF del expediente:", error);
      setDownloadError(
        "No se pudo generar el PDF del expediente. Verifica tu conexión e intenta de nuevo.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Vista previa del animal seleccionado (si ya se eligió uno) */}
      {animalSeleccionado ? (
        <div className="flex flex-col gap-3">
        {downloadError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <X className="h-4 w-4 shrink-0 text-red-600" />
            <span>{downloadError}</span>
          </div>
        )}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="size-11 rounded-xl bg-navy/5 text-navy flex items-center justify-center font-bold text-sm shrink-0 border border-navy/10">
              #{animalSeleccionado.areteInterno}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-slate-900 text-sm">
                  {animalSeleccionado.nombre || "Sin nombre registrado"}
                </h4>
                <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-700 font-mono">
                  Arete #{animalSeleccionado.areteInterno}
                </Badge>
                {animalSeleccionado.numeroOficialDiio ? (
                  <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 font-mono">
                    DIIO: {animalSeleccionado.numeroOficialDiio}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-slate-400">Sin DIIO oficial</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span>{animalSeleccionado.sexo}</span>
                <span>•</span>
                <span>{animalSeleccionado.categoria || "Categoría general"}</span>
                {animalSeleccionado.raza?.nombre && (
                  <>
                    <span>•</span>
                    <span>Raza: {animalSeleccionado.raza.nombre}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleClearSelection}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              Cambiar animal
            </button>
            <button
              type="button"
              onClick={handleDescargarPdf}
              disabled={isDownloading}
              aria-label="Descargar Expediente PDF Animal"
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navy-light transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Generando PDF...
                </>
              ) : (
                <>
                  <Download className="size-3.5" />
                  Descargar reporte PDF
                </>
              )}
            </button>
            <Link
              href={`/hato/${animalSeleccionado.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Abrir ficha interactiva en módulo de Hato"
            >
              Ver en Hato
              <ExternalLink className="size-3 text-slate-400" />
            </Link>
          </div>
        </div>
        </div>
      ) : null}

      {/* Buscador interactivo con dropdown */}
      <div ref={containerRef} className="relative w-full">
        <label htmlFor="buscador-animal-reporte" className="text-xs font-semibold text-slate-700 block mb-1.5">
          {animalSeleccionado ? "Buscar otro animal del hato:" : "Selecciona o busca un animal del hato:"}
        </label>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            id="buscador-animal-reporte"
            ref={inputRef}
            type="text"
            value={query}
            disabled={isLoading}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsOpen(false);
              }
            }}
            placeholder={
              isLoading
                ? "Cargando censo ganadero..."
                : "Buscar por arete (ej. 101), DIIO oficial, nombre o categoría..."
            }
            className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-9 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all shadow-xs"
            aria-label="Buscar animal por arete, DIIO o nombre para ver expediente"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              aria-label="Limpiar término de búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Panel Desplegable de Resultados */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute z-30 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1"
          >
            {/* Header del dropdown con contador */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>
                {filteredAnimales.length} {filteredAnimales.length === 1 ? "animal encontrado" : "animales encontrados"}
              </span>
              {filteredAnimales.length > MAX_DISPLAY_RESULTS && (
                <span className="text-amber-600 font-normal">
                  Mostrando primeros {MAX_DISPLAY_RESULTS}
                </span>
              )}
            </div>

            {/* Lista scrolleable con altura máxima acotada */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {filteredAnimales.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <p className="font-medium text-slate-700">No se encontraron animales</p>
                  <p className="text-slate-400 mt-1">
                    No hay ningún ejemplar que coincida con &quot;{query}&quot;. Intenta con otro número de arete o DIIO.
                  </p>
                </div>
              ) : (
                <ul className="py-1">
                  {visibleAnimales.map((animal) => {
                    const isSelected = animal.id === internalSelectedId;
                    return (
                      <li key={animal.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(animal)}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                            isSelected ? "bg-navy/5 text-navy font-medium" : "text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-bold font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                              #{animal.areteInterno}
                            </span>
                            <div className="truncate">
                              <span className="font-semibold text-slate-900">
                                {animal.nombre || "Sin nombre"}
                              </span>
                              <span className="text-slate-500 text-[11px] ml-2">
                                ({animal.sexo}, {animal.categoria})
                                {' · '}{animal.activo ? 'Activo' : 'Baja'} · {animal.id.slice(0, 8)}
                              </span>
                              {animal.numeroOficialDiio && (
                                <span className="text-[11px] text-blue-600 font-mono ml-2">
                                  DIIO: {animal.numeroOficialDiio}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSelected && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 py-0">
                                <Check className="size-3 mr-1" />
                                Seleccionado
                              </Badge>
                            )}
                            <ChevronRight className="size-3.5 text-slate-400" />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Pie de dropdown si la lista supera el límite */}
            {filteredAnimales.length > MAX_DISPLAY_RESULTS && (
              <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 text-center">
                Escribe más dígitos o letras para refinar la búsqueda entre los {filteredAnimales.length} animales.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
