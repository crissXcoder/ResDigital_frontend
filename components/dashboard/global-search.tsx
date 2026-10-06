"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Loader2, AlertCircle, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { getAnimales, Animal } from "@/lib/api/animales";

/**
 * Buscador global de animales por arete, DIIO o nombre (DASH-T002).
 * Conectado a la API real de animales (GET /animales?buscar=), filtra
 * exclusivamente registros del tenant activo y permite navegar directamente
 * al expediente real del animal (/hato/:id).
 */
export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanQuery = query.trim();
  const shouldSearch = cleanQuery.length > 0;

  const {
    data: animales = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery<Animal[]>({
    queryKey: ["animales-busqueda-global", cleanQuery],
    queryFn: () => getAnimales({ buscar: cleanQuery }),
    enabled: shouldSearch,
    staleTime: 1000 * 30, // 30 segundos
  });

  // Cerrar al hacer click afuera
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

  // Manejar Escape
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const showDropdown = isOpen && shouldSearch;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm" onKeyDown={handleKeyDown}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (shouldSearch) setIsOpen(true);
          }}
          placeholder="Buscar arete, DIIO o nombre..."
          className="pl-8 pr-8 bg-white"
          aria-label="Buscar animal por arete, DIIO o nombre"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          role="combobox"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            aria-label="Limpiar búsqueda"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1"
        >
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin text-navy" />
              <span>Buscando en el hato...</span>
            </div>
          ) : isError ? (
            <div className="flex items-start gap-2.5 px-4 py-3.5 text-sm text-danger bg-danger/5 border-b border-danger/10">
              <AlertCircle className="size-4 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error al buscar animales</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {error instanceof Error ? error.message : "No se pudo conectar con el servidor."}
                </p>
              </div>
            </div>
          ) : animales.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              <p>
                Ningún animal coincide con &quot;
                <span className="font-medium text-slate-700">{cleanQuery}</span>&quot;.
              </p>
              <p className="text-xs text-slate-400 mt-1">Verifica el número de arete, DIIO o nombre.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {animales.length} animal{animales.length !== 1 ? "es" : ""} encontrado
                {animales.length !== 1 ? "s" : ""}
              </div>
              <ul className="py-1">
                {animales.map((animal) => (
                  <li key={animal.id}>
                    <Link
                      href={`/hato/${animal.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between px-3.5 py-2.5 text-sm hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-navy font-mono text-xs bg-navy/5 text-navy px-1.5 py-0.5 rounded">
                            #{animal.areteInterno}
                          </span>
                          <span className="font-medium text-slate-900 truncate">
                            {animal.nombre || "Sin nombre"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          {animal.numeroOficialDiio && (
                            <span className="text-[11px] text-slate-600 font-mono">
                              DIIO: {animal.numeroOficialDiio}
                            </span>
                          )}
                          {animal.categoria && (
                            <span className="text-[11px] text-slate-500">
                              · {animal.categoria}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-slate-400 group-hover:text-navy transition-colors shrink-0">
                        <span className="text-xs mr-1 opacity-0 group-hover:opacity-100 transition-opacity font-medium hidden sm:inline">
                          Ver expediente
                        </span>
                        <ChevronRight className="size-4" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
