'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useRegistrarParto } from '@/lib/hooks/use-reproductivo';
import { partoSchema } from '@/lib/reproductivo/schemas';
import { FACILIDADES_PARTO } from '@/lib/reproductivo/tipos';
import ModalFormulario from './ModalFormulario';

interface PartoFormProps {
  animalId: string;
  /** Precargado desde estado.servicioActivo?.eventoId — no se escribe a mano. */
  eventoServicioId?: string;
  onClose: () => void;
}

export default function PartoForm({
  animalId,
  eventoServicioId,
  onClose,
}: PartoFormProps) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const mutation = useRegistrarParto(animalId);

  const form = useForm({
    defaultValues: {
      fechaEvento: '',
      eventoServicioId: eventoServicioId ?? '',
      criaAnimalId: '',
      facilidadParto: 'Normal',
      observaciones: '',
    },
    onSubmit: async ({ value }) => {
      setErrorServidor(null);
      try {
        await mutation.mutateAsync({
          fechaEvento: value.fechaEvento,
          eventoServicioId: value.eventoServicioId || undefined,
          criaAnimalId: value.criaAnimalId || undefined,
          facilidadParto:
            (value.facilidadParto as
              | 'Normal'
              | 'Distocia'
              | 'Cesárea'
              | 'Aborto'
              | '') || undefined,
          observaciones: value.observaciones || undefined,
        });
        onClose();
      } catch (error) {
        setErrorServidor(
          error instanceof Error ? error.message : 'No se pudo registrar el parto',
        );
      }
    },
  });

  return (
    <ModalFormulario titulo="Registrar parto" onClose={onClose}>
      {errorServidor && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-md bg-danger-bg text-danger border border-danger/30 text-sm font-medium"
        >
          {errorServidor}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <form.Field
            name="fechaEvento"
            validators={{
              onChange: ({ value }) => {
                const res = partoSchema.shape.fechaEvento.safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Fecha de parto *
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-danger font-medium">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="facilidadParto">
            {(field) => (
              <div className="space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Desenlace
                </label>
                <select
                  id={field.name}
                  name={field.name}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                >
                  {FACILIDADES_PARTO.map((facilidad) => (
                    <option key={facilidad} value={facilidad}>
                      {facilidad}
                    </option>
                  ))}
                </select>
                {field.state.value === 'Aborto' && (
                  <p className="text-xs text-slate-400">
                    Cierra la preñez sin cría viable.
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="criaAnimalId">
            {(field) => (
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  ID de la cría (si ya está registrada en el hato)
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e1d67412-21d9-482f-870d-f55da282b810"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="observaciones">
            {(field) => (
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Observaciones
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Cría hembra nacida vigorosa, 38 kg de peso al nacer"
                />
              </div>
            )}
          </form.Field>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Registrando...' : 'Registrar parto'}
          </button>
        </div>
      </form>
    </ModalFormulario>
  );
}
