'use client';
import { useQuery } from '@tanstack/react-query';
import { getHistorialBajas } from '@/lib/api/historial-bajas';
import { formatearFecha } from '@/lib/reproductivo/fechas';

export function HistorialBajas({ animalId }: { animalId: string }) {
  const historial = useQuery({ queryKey: ['historialBajas', animalId], queryFn: () => getHistorialBajas(animalId) });
  if (historial.isError) return <p role="alert" className="my-4 text-danger">No se pudo consultar el historial de bajas y retornos.</p>;
  if (!historial.data?.length) return null;
  return <section className="my-4 rounded-xl border border-slate-200 bg-white p-5" aria-label="Historial de bajas y retornos">
    <h2 className="font-semibold text-navy">Historial de bajas y retornos</h2>
    <ul className="mt-3 space-y-3 text-sm text-slate-700">{historial.data.map((episodio) => <li key={episodio.eventoId}>
      {formatearFecha(episodio.fecha)} · {episodio.tipoBaja}{episodio.revertido ? ' · Registro corregido' : ''} · {episodio.motivo || 'Sin motivo registrado'}
      {episodio.modalidad && <p>{episodio.modalidad === 'RETORNO' ? 'Retorno' : 'Corrección de baja'} · {episodio.fechaReactivacion ? formatearFecha(episodio.fechaReactivacion) : ''} · {episodio.motivoReactivacion}</p>}
    </li>)}</ul>
  </section>;
}
