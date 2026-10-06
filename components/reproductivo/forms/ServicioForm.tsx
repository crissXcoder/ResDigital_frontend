'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useRegistrarServicio } from '@/lib/hooks/use-reproductivo';
import { servicioSchema } from '@/lib/reproductivo/schemas';
import { TIPOS_SERVICIO } from '@/lib/reproductivo/tipos';
import ModalFormulario from './ModalFormulario';

/**
 * Registrar servicio reproductivo. Corrección del bug B5:
 *  - El select solo ofrece los 2 tipos que el backend acepta. Se quita
 *    'Transferencia de Embriones' (el DTO la rechaza con 400) y se quita el
 *    campo suelto de "Potrero" (vive en MOD-05, no es un dato del servicio).
 *  - El título ya no dice "Registrar Celo / Servicio": ese título es lo que
 *    hacía creer que detectar un celo proyecta cronograma. El celo detectado
 *    es un evento informativo y no genera cronograma — nota bajo el select.
 */
interface ServicioFormProps {
  animalId: string;
  onClose: () => void;
}

export default function ServicioForm({ animalId, onClose }: ServicioFormProps) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const mutation = useRegistrarServicio(animalId);

  const form = useForm({
    defaultValues: {
      fechaEvento: '',
      tipoServicio: 'Inseminación Artificial',
      toroOPajilla: '',
      responsable: '',
      notas: '',
    },
    onSubmit: async ({ value }) => {
      setErrorServidor(null);
      try {
        await mutation.mutateAsync({
          fechaEvento: value.fechaEvento,
          tipoServicio: value.tipoServicio as 'Inseminación Artificial' | 'Monta Natural',
          toroOPajilla: value.toroOPajilla,
          responsable: value.responsable || undefined,
          notas: value.notas || undefined,
        });
        onClose();
      } catch (error) {
        setErrorServidor(
          error instanceof Error ? error.message : 'No se pudo registrar el servicio',
        );
      }
    },
  });

  return (
    <ModalFormulario titulo="Registrar servicio" onClose={onClose}>
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
            name="tipoServicio"
            validators={{
              onChange: ({ value }) => {
                const res = servicioSchema.shape.tipoServicio.safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Tipo de servicio
                </label>
                <select
                  id={field.name}
                  name={field.name}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                >
                  {TIPOS_SERVICIO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">
                  El celo detectado es un evento informativo: no proyecta cronograma.
                </p>
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-danger font-medium">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="fechaEvento"
            validators={{
              onChange: ({ value }) => {
                const res = servicioSchema.shape.fechaEvento.safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Fecha de servicio *
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
            name="toroOPajilla"
            validators={{
              onChange: ({ value }) => {
                const res = servicioSchema.shape.toroOPajilla.safeParse(value);
                return res.success ? undefined : res.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Toro / ID pajilla *
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Titan (CRC-B-001)"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-danger font-medium">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="responsable">
            {(field) => (
              <div className="space-y-1.5">
                <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                  Responsable
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Dr. Roberto García"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="notas">
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
            {mutation.isPending ? 'Registrando...' : 'Registrar servicio'}
          </button>
        </div>
      </form>
    </ModalFormulario>
  );
}
