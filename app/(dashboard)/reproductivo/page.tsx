'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { useProximosEventosFinca } from '@/lib/hooks/use-reproductivo';
import { ChipHito } from '@/components/reproductivo/EstadoChip';
import { formatearFecha, textoDiasRestantes } from '@/lib/reproductivo/fechas';
import type { TipoEventoFeed } from '@/lib/reproductivo/tipos';

/**
 * Calendario reproductivo de toda la finca. GET /reproductivo/proximos-eventos,
 * consumido por useProximosEventosFinca (lib/hooks/use-reproductivo.ts), que
 * comparte clave con el feed del dashboard: registrar un evento desde acá o
 * desde la ficha del animal actualiza ambas pantallas solo.
 *
 * "Aviso Parto FPP" en el feed de finca viene publicado como 'Parto'
 * (ver lib/reproductivo/tipos.ts, TipoEventoFeed) — distinto de 'Parto FPP'
 * que usa el hito de un solo animal.
 */
const DIAS_VENTANA_DEFAULT = 60;

const FILTROS: { label: string; tipo: TipoEventoFeed | 'Todos' }[] = [
  { label: 'Todos', tipo: 'Todos' },
  { label: 'Palpación', tipo: 'Palpación' },
  { label: 'Secado', tipo: 'Secado' },
  { label: 'Aviso Parto', tipo: 'Aviso Parto' },
  { label: 'Aviso Parto Urgente', tipo: 'Aviso Parto Urgente' },
  { label: 'Parto', tipo: 'Parto' },
];

export default function ReproductivoPage() {
  const [diasVentana, setDiasVentana] = useState(DIAS_VENTANA_DEFAULT);
  const [filtro, setFiltro] = useState<TipoEventoFeed | 'Todos'>('Todos');

  const { data: eventos, isLoading, isError } = useProximosEventosFinca(diasVentana);

  const eventosFiltrados = useMemo(() => {
    const lista = eventos ?? [];
    const filtrados = filtro === 'Todos' ? lista : lista.filter((e) => e.tipo === filtro);
    return [...filtrados].sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [eventos, filtro]);

  const urgentes = (eventos ?? []).filter((e) => e.urgente).length;
  const vencidos = (eventos ?? []).filter((e) => e.diasRestantes < 0).length;

  return (
    <main className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">Reproducción</h1>
          <p className="text-sm text-slate-500 mt-1">
            Calendario reproductivo de toda la finca — palpaciones, secados y avisos de parto próximos.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Hitos en ventana
            </p>
            <p className="text-3xl font-extrabold text-navy">{eventos?.length ?? 0}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Avisos urgentes (FPP-3)
            </p>
            <p className="text-3xl font-extrabold text-danger">{urgentes}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Vencidos (últimos 7 días)
            </p>
            <p className="text-3xl font-extrabold text-warning">{vencidos}</p>
          </div>
        </div>

        {/* Filtros por tipo */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTROS.map((f) => (
              <button
                key={f.label}
                onClick={() => setFiltro(f.tipo)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                  filtro === f.tipo
                    ? 'bg-navy text-white border-transparent'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            Ventana:
            <select
              value={diasVentana}
              onChange={(e) => setDiasVentana(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-light"
            >
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
              <option value={180}>180 días</option>
            </select>
          </label>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Animal
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Hito
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Restante
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 font-medium">
                      Cargando calendario reproductivo...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <span className="inline-flex items-center gap-2 text-danger text-sm font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        No se pudo cargar el calendario reproductivo.
                      </span>
                    </td>
                  </tr>
                ) : eventosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 font-medium">
                      <span className="inline-flex flex-col items-center gap-2">
                        <CalendarClock className="w-8 h-8 text-slate-300" />
                        No hay hitos reproductivos en esta ventana.
                      </span>
                    </td>
                  </tr>
                ) : (
                  eventosFiltrados.map((evento) => (
                    <tr
                      key={`${evento.animalId}-${evento.tipo}-${evento.fecha}`}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        evento.urgente ? 'bg-danger-bg/40' : ''
                      }`}
                    >
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-navy text-sm">{evento.nombre}</span>
                        <span className="text-slate-400 font-mono text-xs ml-2">
                          ({evento.arete})
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-2">
                          {evento.urgente && <AlertTriangle className="w-4 h-4 text-danger" />}
                          <ChipHito tipo={evento.tipo === 'Parto' ? 'Parto FPP' : evento.tipo} />
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-700">
                        {formatearFecha(evento.fecha)}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span
                          className={
                            evento.diasRestantes < 0
                              ? 'text-warning font-semibold'
                              : 'text-slate-600'
                          }
                        >
                          {textoDiasRestantes(evento.diasRestantes)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/hato/${evento.animalId}`}
                          className="px-4 py-2 bg-navy text-white text-xs font-bold rounded-lg hover:bg-navy-light transition-colors shadow-sm"
                        >
                          Ver ficha
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
