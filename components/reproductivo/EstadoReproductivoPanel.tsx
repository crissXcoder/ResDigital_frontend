'use client';

import { AlertTriangle } from 'lucide-react';
import { ChipEstado, ChipHito } from './EstadoChip';
import { formatearFecha, textoDiasRestantes } from '@/lib/reproductivo/fechas';
import type { EstadoReproductivoResponse } from '@/lib/reproductivo/tipos';

/**
 * Bloque destacado: estado actual, servicio activo, próximos hitos y los
 * botones de acción según la máquina de estados
 * (backend/reproductive-state.service.ts:282-284):
 *   Vacía → Servida → Preñada → En Secado → (parto) → Vacía
 */
interface EstadoReproductivoPanelProps {
  estado: EstadoReproductivoResponse;
  puedeRegistrarServicio: boolean;
  puedeRegistrarDiagnostico: boolean;
  puedeRegistrarSecado: boolean;
  puedeRegistrarParto: boolean;
  onRegistrarServicio: () => void;
  onRegistrarDiagnostico: () => void;
  onRegistrarSecado: () => void;
  onRegistrarParto: () => void;
}

export default function EstadoReproductivoPanel({
  estado,
  puedeRegistrarServicio,
  puedeRegistrarDiagnostico,
  puedeRegistrarSecado,
  puedeRegistrarParto,
  onRegistrarServicio,
  onRegistrarDiagnostico,
  onRegistrarSecado,
  onRegistrarParto,
}: EstadoReproductivoPanelProps) {
  const { estadoActual, servicioActivo, proximosHitos, advertencias, diasEnEstado } = estado;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ChipEstado estado={estadoActual} />
          {typeof diasEnEstado === 'number' && (
            <span className="text-sm text-slate-500">
              hace {diasEnEstado} día{diasEnEstado === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {estadoActual === 'Vacía' && puedeRegistrarServicio && (
            <BotonAccion onClick={onRegistrarServicio}>Registrar servicio</BotonAccion>
          )}
          {estadoActual === 'Servida' && (
            <>
              {puedeRegistrarDiagnostico && <BotonAccion onClick={onRegistrarDiagnostico}>
                Registrar diagnóstico
              </BotonAccion>}
              {puedeRegistrarServicio && <BotonAccion variante="secundario" onClick={onRegistrarServicio}>
                Registrar servicio
              </BotonAccion>}
            </>
          )}
          {estadoActual === 'Preñada' && (
            <>
              {puedeRegistrarSecado && <BotonAccion variante="secundario" onClick={onRegistrarSecado}>
                Registrar secado
              </BotonAccion>}
              {puedeRegistrarParto && <BotonAccion onClick={onRegistrarParto}>Registrar parto</BotonAccion>}
            </>
          )}
          {estadoActual === 'En Secado' && (
            puedeRegistrarParto && <BotonAccion onClick={onRegistrarParto}>Registrar parto</BotonAccion>
          )}
        </div>
      </div>

      {servicioActivo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <Dato etiqueta="Servicio" valor={formatearFecha(servicioActivo.fechaServicio)} />
          <Dato etiqueta="Tipo" valor={servicioActivo.tipoServicio} />
          <Dato etiqueta="Toro / pajilla" valor={servicioActivo.toroOPajilla} />
          <Dato
            etiqueta="FPP"
            valor={formatearFecha(servicioActivo.fpp)}
            destacado
          />
        </div>
      )}

      {proximosHitos && proximosHitos.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-navy">Próximos hitos</h4>
          <div className="flex flex-col gap-2">
            {proximosHitos.map((hito) => (
              <div
                key={`${hito.tipo}-${hito.fecha}`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-2">
                  {hito.urgente && <AlertTriangle className="w-4 h-4 text-danger" />}
                  <ChipHito tipo={hito.tipo} />
                </div>
                <div className="text-sm text-slate-600">
                  {formatearFecha(hito.fecha)} · {textoDiasRestantes(hito.diasRestantes)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {advertencias && advertencias.length > 0 && (
        <div className="p-4 rounded-xl bg-warning-bg text-warning-strong border border-warning/30 text-sm space-y-1">
          {advertencias.map((advertencia) => (
            <p key={advertencia}>{advertencia}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
        {etiqueta}
      </div>
      <div className={`text-sm ${destacado ? 'font-bold text-success' : 'text-slate-700'}`}>
        {valor}
      </div>
    </div>
  );
}

function BotonAccion({
  children,
  onClick,
  variante = 'primario',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variante?: 'primario' | 'secundario';
}) {
  const clases =
    variante === 'primario'
      ? 'bg-navy text-white hover:bg-navy-light'
      : 'border border-slate-300 text-slate-700 hover:bg-slate-50';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${clases}`}
    >
      {children}
    </button>
  );
}
