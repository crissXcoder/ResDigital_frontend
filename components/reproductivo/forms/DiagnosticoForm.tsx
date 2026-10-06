'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useRegistrarDiagnostico } from '@/lib/hooks/use-reproductivo';
import { diagnosticoSchema } from '@/lib/reproductivo/schemas';
import { METODOS_DIAGNOSTICO, RESULTADOS_DIAGNOSTICO } from '@/lib/reproductivo/tipos';
import ModalFormulario from './ModalFormulario';

interface DiagnosticoFormProps {
  animalId: string;
  eventoServicioId: string;
  onClose: () => void;
}

export default function DiagnosticoForm({
  animalId,
  eventoServicioId,
  onClose,
}: DiagnosticoFormProps) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const mutation = useRegistrarDiagnostico(animalId);

  const form = useForm({
    defaultValues: {
      fechaEvento: '',
      eventoServicioId,
      metodo: 'Palpación',
      resultado: 'Preñada',
      notas: '',
    },
    onSubmit: async ({ value }) => {
      setErrorServidor(null);
      try {
        await mutation.mutateAsync({
          fechaEvento: value.fechaEvento,
          eventoServicioId: value.eventoServicioId,
          metodo: value.metodo as 'Palpación' | 'Ecografía' | 'PAG',
          resultado: value.resultado as 'Preñada' | 'Vacía',
          notas: value.notas || undefined,
        });
        onClose();
      } catch (error) {
        setErrorServidor(
          error instanceof Error ? error.message : 'No se pudo registrar el diagnóstico',
        );
      }
    },
  });

  return (
    <ModalFormulario titulo="Registrar diagnóstico de preñez" onClose={onClose}>
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
                const res = diagnosticoSchema.shape.fechaEvento.safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Fecha de diagnóstico *
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

          <form.Field
            name="metodo"
            validators={{
              onChange: ({ value }) => {
                const res = diagnosticoSchema.shape.metodo.safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Método *
                </label>
                <select
                  id={field.name}
                  name={field.name}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                >
                  {METODOS_DIAGNOSTICO.map((metodo) => (
                    <option key={metodo} value={metodo}>
                      {metodo}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>

          <form.Field
            name="resultado"
            validators={{
              onChange: ({ value }) => {
                const res = diagnosticoSchema.shape.resultado.safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Resultado *
                </label>
                <select
                  id={field.name}
                  name={field.name}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                >
                  {RESULTADOS_DIAGNOSTICO.map((resultado) => (
                    <option key={resultado} value={resultado}>
                      {resultado}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>

          <form.Field name="notas">
            {(field) => (
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Notas
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Cuerpo lúteo palpable en cuerno derecho"
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
            {mutation.isPending ? 'Registrando...' : 'Registrar diagnóstico'}
          </button>
        </div>
      </form>
    </ModalFormulario>
  );
}
