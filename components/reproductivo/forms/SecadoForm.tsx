'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useRegistrarSecado } from '@/lib/hooks/use-reproductivo';
import { secadoSchema } from '@/lib/reproductivo/schemas';
import ModalFormulario from './ModalFormulario';

interface SecadoFormProps {
  animalId: string;
  onClose: () => void;
}

export default function SecadoForm({ animalId, onClose }: SecadoFormProps) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const mutation = useRegistrarSecado(animalId);

  const form = useForm({
    defaultValues: {
      fechaEvento: '',
      notas: '',
    },
    onSubmit: async ({ value }) => {
      setErrorServidor(null);
      try {
        await mutation.mutateAsync({
          fechaEvento: value.fechaEvento,
          notas: value.notas || undefined,
        });
        onClose();
      } catch (error) {
        setErrorServidor(
          error instanceof Error ? error.message : 'No se pudo registrar el secado',
        );
      }
    },
  });

  return (
    <ModalFormulario titulo="Registrar secado" onClose={onClose}>
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
        <form.Field
          name="fechaEvento"
          validators={{
            onChange: ({ value }) => {
              const res = secadoSchema.shape.fechaEvento.safeParse(value);
              return res.success ? undefined : res.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                Fecha de suspensión del ordeño *
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
              <p className="text-xs text-slate-400">
                Puede diferir de la fecha de secado calculada (FPP - 60 días).
              </p>
              {field.state.meta.errors.length > 0 && (
                <p className="text-xs text-danger font-medium">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="notas">
          {(field) => (
            <div className="space-y-1.5">
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
                placeholder="Infusión de secado + sellador de pezones"
              />
            </div>
          )}
        </form.Field>

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
            {mutation.isPending ? 'Registrando...' : 'Registrar secado'}
          </button>
        </div>
      </form>
    </ModalFormulario>
  );
}
