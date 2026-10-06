'use client';

import { CheckCircle2 } from 'lucide-react';
import { formatearFecha, hoyLocal } from '@/lib/reproductivo/fechas';
import { CLASES_HITO } from '@/lib/reproductivo/estado-colores';
import type { EstadoReproductivoResponse } from '@/lib/reproductivo/tipos';

/**
 * Reemplaza la "Línea de Tiempo Gestación" que hato/[id]/page.tsx:662-737
 * pintaba con 4 fechas escritas a mano (15/01/2026, 24/02/2026, 01/09/2026,
 * 30/09/2026), visibles en toda hembra aunque nunca hubiera tenido un
 * servicio. Misma estructura visual (timeline alternada), pero los 6 pasos
 * salen de servicioActivo/proximosHitos reales.
 *
 * Recibe el estado ya cargado por props: no duplica la petición que la
 * página de Danny ya hace en `['estadoReproductivo', animalId]`.
 */
interface LineaTiempoGestacionProps {
  // `estado` puede venir tipado como `any` desde la página que lo consume
  // (hato/[id]/page.tsx no está tipado); EstadoReproductivoResponse | undefined
  // acepta `any` sin fricción.
  estado: EstadoReproductivoResponse | undefined;
}

interface PasoTimeline {
  etiqueta: string;
  fecha: string | undefined;
  cumplido: boolean;
  claseCirculo: string;
}

export default function LineaTiempoGestacion({ estado }: LineaTiempoGestacionProps) {
  const servicioActivo = estado?.servicioActivo;

  if (!servicioActivo) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
        <h3 className="text-lg font-bold text-navy mb-4">Línea de Tiempo Gestación</h3>
        <p className="text-sm text-slate-400">Sin ciclo reproductivo activo.</p>
      </div>
    );
  }

  const hoy = hoyLocal();
  const hitosPorTipo = new Map((estado?.proximosHitos ?? []).map((h) => [h.tipo, h]));

  const pasos: PasoTimeline[] = [
    {
      etiqueta: 'Servicio',
      fecha: servicioActivo.fechaServicio,
      cumplido: true,
      claseCirculo: 'bg-info text-white',
    },
    {
      etiqueta: 'Palpación',
      fecha: servicioActivo.palpacionFecha,
      cumplido: (servicioActivo.palpacionFecha ?? '') <= hoy,
      claseCirculo: CLASES_HITO['Palpación'],
    },
    {
      etiqueta: 'Secado',
      fecha: servicioActivo.secadoFecha,
      cumplido: (servicioActivo.secadoFecha ?? '') <= hoy,
      claseCirculo: CLASES_HITO['Secado'],
    },
    {
      etiqueta: 'Aviso Parto',
      fecha: servicioActivo.avisoPartoFecha,
      cumplido: (servicioActivo.avisoPartoFecha ?? '') <= hoy,
      claseCirculo: CLASES_HITO['Aviso Parto'],
    },
    {
      etiqueta: 'Aviso Parto Urgente',
      fecha: servicioActivo.avisoPartoUrgenteFecha,
      cumplido: (servicioActivo.avisoPartoUrgenteFecha ?? '') <= hoy,
      claseCirculo: CLASES_HITO['Aviso Parto Urgente'],
    },
    {
      etiqueta: 'FPP',
      fecha: servicioActivo.fpp,
      cumplido: (servicioActivo.fpp ?? '') <= hoy,
      claseCirculo: CLASES_HITO['Parto FPP'],
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
      <h3 className="text-lg font-bold text-navy mb-8">Línea de Tiempo Gestación</h3>

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200">
        {pasos.map((paso, indice) => (
          <div
            key={paso.etiqueta}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${
                paso.cumplido
                  ? `${paso.claseCirculo.split(' ')[0]} text-white`
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {paso.cumplido ? <CheckCircle2 className="w-5 h-5" /> : indice + 1}
            </div>
            <div
              className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl flex justify-between items-center ${
                paso.cumplido
                  ? 'bg-white border border-slate-200 shadow-sm'
                  : 'bg-transparent'
              }`}
            >
              <div>
                <div
                  className={`font-bold text-sm ${
                    paso.cumplido ? 'text-navy' : 'text-slate-600'
                  }`}
                >
                  {paso.etiqueta}
                  {hitosPorTipo.get(paso.etiqueta as never)?.urgente && (
                    <span className="ml-1 text-danger">⚠</span>
                  )}
                </div>
                <div
                  className={`text-xs mt-0.5 ${
                    paso.cumplido ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {formatearFecha(paso.fecha)}
                </div>
              </div>
              {paso.cumplido && (
                <span className="text-[10px] font-bold text-success bg-success-bg px-2 py-1 rounded">
                  Confirmado
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
