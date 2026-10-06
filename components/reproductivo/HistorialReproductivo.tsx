'use client';

import { ChipEvento, ChipResultadoDiagnostico, ChipRevertido } from './EstadoChip';
import { formatearFecha } from '@/lib/reproductivo/fechas';
import {
  esDetalleDiagnostico,
  esDetalleParto,
  esDetalleServicio,
  type EventoHistorial,
} from '@/lib/reproductivo/tipos';

/**
 * Historial cronológico completo. El backend ya lo ordena
 * (fechaEvento ASC, fechaRegistro ASC). Los eventos revertidos NO se
 * ocultan: el registro es append-only y una corrección tiene que poder
 * verse — lo exige el endpoint y lo exige Ley 8968.
 */
interface HistorialReproductivoProps {
  eventos: EventoHistorial[];
}

export default function HistorialReproductivo({ eventos }: HistorialReproductivoProps) {
  if (eventos.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center text-slate-400">
        Todavía no hay eventos reproductivos registrados.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100">
        <h3 className="text-lg font-bold text-navy">Historial reproductivo</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4 pl-6 sm:pl-8">Fecha</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Detalle</th>
              <th className="p-4">Notas</th>
              <th className="p-4 pr-6 sm:pr-8">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
            {eventos.map((evento) => (
              <tr
                key={evento.eventoId}
                className={`hover:bg-slate-50 transition-colors ${
                  evento.revertido ? 'line-through opacity-60' : ''
                }`}
              >
                <td className="p-4 pl-6 sm:pl-8">{formatearFecha(evento.fechaEvento)}</td>
                <td className="p-4">
                  <ChipEvento tipo={evento.tipo} />
                </td>
                <td className="p-4">
                  <DetalleEvento evento={evento} />
                </td>
                <td className="p-4 text-slate-400 truncate max-w-[200px]">
                  {evento.notas || '—'}
                </td>
                <td className="p-4 pr-6 sm:pr-8">
                  {evento.revertido && <ChipRevertido />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetalleEvento({ evento }: { evento: EventoHistorial }) {
  if (esDetalleServicio(evento)) {
    return (
      <span>
        {evento.detalle.tipoServicio} · {evento.detalle.toroOPajilla}
      </span>
    );
  }
  if (esDetalleDiagnostico(evento)) {
    const resultado = evento.detalle.resultado as 'Preñada' | 'Vacía';
    return (
      <span className="flex items-center gap-2">
        {evento.detalle.metodo} <ChipResultadoDiagnostico resultado={resultado} />
      </span>
    );
  }
  if (esDetalleParto(evento)) {
    return <span>{evento.detalle.facilidadParto ?? 'Normal'}</span>;
  }
  return <span className="text-slate-400">—</span>;
}
