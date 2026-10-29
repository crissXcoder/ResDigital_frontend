'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import ModalFormulario from '@/components/reproductivo/forms/ModalFormulario';
import { getBajaAnimal, reactivarAnimal, type Animal } from '@/lib/api/animales';
import { hoyLocal } from '@/lib/reproductivo/fechas';

export function ModalReactivarAnimal({ animal, onClose }: { animal: Animal | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const baja = useQuery({ queryKey: ['bajaAnimal', animal?.id], queryFn: () => getBajaAnimal(animal!.id), enabled: !!animal });
  const [modalidad, setModalidad] = useState<'RETORNO' | 'CORRECCION'>('RETORNO');
  const [fechaEvento, setFechaEvento] = useState(hoyLocal());
  const [motivo, setMotivo] = useState('');
  const [areteInterno, setAreteInterno] = useState('');
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: () => reactivarAnimal(animal!.id, {
      modalidad: baja.data?.tipoBaja === 'Fallecimiento' ? 'CORRECCION' : modalidad,
      eventoBajaId: baja.data!.eventoId!,
      fechaEvento,
      motivo: motivo.trim(),
      areteInterno: areteInterno.trim() || undefined,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['animales'] }),
        queryClient.invalidateQueries({ queryKey: ['animal', animal?.id] }),
        queryClient.invalidateQueries({ queryKey: ['bajaAnimal', animal?.id] }),
        queryClient.invalidateQueries({ queryKey: ['historialBajas', animal?.id] }),
        queryClient.invalidateQueries({ queryKey: ['potreros'] }),
        queryClient.invalidateQueries({ queryKey: ['lactancia'] }),
      ]);
      onClose();
    },
    onError: (cause: Error) => setError(cause.message),
  });
  if (!animal) return null;
  return (
    <ModalFormulario titulo={`Reactivar ${animal.areteInterno}`} onClose={onClose} pendiente={mutation.isPending}>
        {baja.isLoading ? <p role="status">Cargando baja vigente…</p> : baja.isError || !baja.data?.eventoId ? <p role="alert">No se pudo consultar una baja vigente para este animal.</p> : (
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (motivo.trim().length < 3) { setError('El motivo debe tener al menos 3 caracteres.'); return; } setError(''); mutation.mutate(); }}>
            {baja.data.tipoBaja === 'Fallecimiento' && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">La baja por fallecimiento solo permite corregir el registro; no se registra como retorno.</p>}
            <label className="block text-sm font-medium">Operación
              <select className="mt-1 w-full rounded border p-2" value={baja.data.tipoBaja === 'Fallecimiento' ? 'CORRECCION' : modalidad} onChange={(e) => setModalidad(e.target.value as 'RETORNO' | 'CORRECCION')}>
                <option value="RETORNO" disabled={baja.data.tipoBaja === 'Fallecimiento'}>Retorno al hato</option>
                <option value="CORRECCION">Corregir baja errónea</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Fecha de operación
              <input required type="date" min={baja.data.fechaBaja} max={hoyLocal()} value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="block text-sm font-medium">Motivo (mínimo 3 caracteres)
              <textarea required minLength={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="block text-sm font-medium">Arete interno nuevo (solo si el anterior está ocupado)
              <input maxLength={100} value={areteInterno} onChange={(e) => setAreteInterno(e.target.value)} className="mt-1 w-full rounded border p-2" />
            </label>
            <p className="text-sm text-slate-600">El potrero y la lactancia no se restauran automáticamente. Asígnelos según la ubicación y el estado reales.</p>
            {(error || mutation.isError) && <p role="alert" className="text-sm text-red-700">{error || (mutation.error as Error).message}</p>}
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={onClose} className="rounded border px-4 py-2">Cancelar</button>
              <button type="submit" disabled={mutation.isPending} className="flex items-center gap-2 rounded bg-navy px-4 py-2 font-semibold text-white disabled:opacity-50">{mutation.isPending && <Loader2 className="animate-spin" size={16} />}Confirmar reactivación</button>
            </div>
          </form>
        )}
    </ModalFormulario>
  );
}
