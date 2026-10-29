'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { getAnimales } from '@/lib/api/animales';
import { SEXOS } from '@/lib/api/catalogos';
import { useRegistrarParto } from '@/lib/hooks/use-reproductivo';
import {
  fechaEventoSchema,
  MODALIDADES_CRIA,
  partoAPayload,
  partoSchema,
  type ModalidadCria,
} from '@/lib/reproductivo/schemas';
import { FACILIDADES_PARTO } from '@/lib/reproductivo/tipos';
import ModalFormulario from './ModalFormulario';
import type { EventoHistorial, DetalleParto } from '@/lib/reproductivo/tipos';

interface PartoFormProps {
  animalId: string;
  /** Precargado desde estado.servicioActivo?.eventoId — no se escribe a mano. */
  eventoServicioId?: string;
  onClose: () => void;
  correccion?: EventoHistorial & { detalle: DetalleParto };
}

const ETIQUETA_MODALIDAD: Record<ModalidadCria, string> = {
  ninguna: 'Sin alta de cría',
  nueva: 'Cría nueva',
  existente: 'Cría existente',
};

export default function PartoForm({
  animalId,
  eventoServicioId,
  onClose,
  correccion,
}: PartoFormProps) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [accionFiliacion, setAccionFiliacion] = useState<'' | 'CONSERVAR' | 'DESVINCULAR'>('');
  const mutation = useRegistrarParto(animalId);
  const listado = useQuery({
    queryKey: ['animales'],
    queryFn: () => getAnimales({ activo: 'true' }),
  });

  const form = useForm({
    defaultValues: {
      fechaEvento: correccion?.fechaEvento ?? '',
      eventoServicioId: correccion?.detalle.eventoServicioId ?? eventoServicioId ?? '',
      modalidadCria: (correccion?.detalle.criaAnimalId ? 'existente' : 'ninguna') as ModalidadCria,
      criaAnimalId: correccion?.detalle.criaAnimalId ?? '',
      confirmarFechaNacimiento: false,
      areteInterno: '',
      sexo: '' as '' | (typeof SEXOS)[number],
      pesoNacimientoKg: '',
      facilidadParto: (correccion?.detalle.facilidadParto ?? 'Normal') as string,
      observaciones: correccion?.detalle.observaciones ?? '',
    },
    onSubmit: async ({ value }) => {
      const parsed = partoSchema.safeParse(value);
      if (!parsed.success) {
        setErrorServidor(
          parsed.error.issues[0]?.message ?? 'Revisá los datos del parto',
        );
        return;
      }
      const criaElegida = candidatos.find((animal) => animal.id === parsed.data.criaAnimalId);
      if (parsed.data.modalidadCria === 'existente' && criaElegida && !criaElegida.fechaNacimiento && !parsed.data.confirmarFechaNacimiento) {
        setErrorServidor('Confirmá que la ficha corresponde a esta cría para registrar la fecha del parto.');
        return;
      }
      setErrorServidor(null);
      try {
        if (correccion?.detalle.criaAnimalId && !accionFiliacion) {
          setErrorServidor('Seleccioná cómo reconciliar la filiación anterior.');
          return;
        }
        await mutation.mutateAsync({ ...partoAPayload(parsed.data), eventoCorrigeId: correccion?.eventoId, accionFiliacionAnterior: accionFiliacion || undefined });
        onClose();
      } catch (error) {
        setErrorServidor(
          error instanceof Error ? error.message : 'No se pudo registrar el parto',
        );
      }
    },
  });

  const candidatos =
    listado.data?.filter((animal) => animal.id !== animalId) ?? [];

  return (
    <ModalFormulario titulo={correccion ? 'Corregir parto' : 'Registrar parto'} onClose={onClose} pendiente={mutation.isPending}>
      {correccion && <p className="mb-4 text-sm text-slate-700">La corrección conserva el evento original y la ficha de la cría. Elegí los datos que tendrá el nuevo evento.</p>}
      {correccion?.detalle.criaAnimalId && <label className="mb-4 block text-sm font-medium">Filiación de la cría anterior
        <select aria-label="Filiación de la cría anterior" className="mt-1 w-full rounded border p-2" value={accionFiliacion} onChange={(event) => setAccionFiliacion(event.target.value as typeof accionFiliacion)}>
          <option value="">Seleccionar decisión explícita</option><option value="CONSERVAR">Conservar filiación con esta madre</option><option value="DESVINCULAR">Desvincular de esta madre conservando su ficha</option>
        </select>
      </label>}
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
                const res = fechaEventoSchema.safeParse(value);
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
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    if (e.target.value === 'Aborto') {
                      form.setFieldValue('modalidadCria', 'ninguna');
                    }
                  }}
                >
                  {FACILIDADES_PARTO.map((facilidad) => (
                    <option key={facilidad} value={facilidad}>
                      {facilidad}
                    </option>
                  ))}
                </select>
                {field.state.value === 'Aborto' && (
                  <p className="text-xs text-slate-400">
                    Cierra la preñez sin cría viable. Se sugiere no dar de alta cría.
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="modalidadCria">
            {(field) => (
              <fieldset className="sm:col-span-2 space-y-2">
                <legend className="block text-sm font-semibold text-navy">
                  Cría
                </legend>
                <div className="flex flex-col sm:flex-row gap-3">
                  {MODALIDADES_CRIA.map((modalidad) => (
                    <label
                      key={modalidad}
                      className="inline-flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={modalidad}
                        checked={field.state.value === modalidad}
                        disabled={form.state.values.facilidadParto === 'Aborto' && modalidad !== 'ninguna'}
                        onChange={() => field.handleChange(modalidad)}
                      />
                      {ETIQUETA_MODALIDAD[modalidad]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.modalidadCria}>
            {(modalidadCria) =>
              modalidadCria === 'nueva' ? (
                <>
                  <form.Field
                    name="areteInterno"
                    validators={{
                      onChange: ({ value, fieldApi }) => {
                        const res = partoSchema.safeParse({
                          ...fieldApi.form.state.values,
                          areteInterno: value,
                        });
                        if (res.success) return undefined;
                        return res.error.issues.find((issue) => issue.path[0] === 'areteInterno')
                          ?.message;
                      },
                    }}
                  >
                    {(field) => (
                      <div className="space-y-1.5">
                        <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                          Arete interno *
                        </label>
                        <input
                          id={field.name}
                          name={field.name}
                          type="text"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="CR-2026-001"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-xs text-danger font-medium">
                            {field.state.meta.errors[0]}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="sexo">
                    {(field) => (
                      <div className="space-y-1.5">
                        <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                          Sexo *
                        </label>
                        <select
                          id={field.name}
                          name={field.name}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(e.target.value as '' | (typeof SEXOS)[number])
                          }
                        >
                          <option value="">Seleccionar sexo</option>
                          {SEXOS.map((sexo) => (
                            <option key={sexo} value={sexo}>
                              {sexo}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="pesoNacimientoKg">
                    {(field) => (
                      <div className="sm:col-span-2 space-y-1.5">
                        <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                          Peso al nacer (kg)
                        </label>
                        <input
                          id={field.name}
                          name={field.name}
                          type="number"
                          min="0"
                          step="0.1"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="38.5"
                        />
                      </div>
                    )}
                  </form.Field>
                </>
              ) : modalidadCria === 'existente' ? (
                <div className="sm:col-span-2 space-y-1.5">
                  {listado.isLoading ? (
                    <p className="text-sm text-slate-500">Cargando animales de la finca…</p>
                  ) : listado.isError ? (
                    <p role="alert" className="text-sm text-danger font-medium">
                      No se pudo cargar el hato para elegir la cría.
                    </p>
                  ) : candidatos.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No hay otros animales activos en la finca para vincular como cría.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <form.Field name="criaAnimalId">
                        {(field) => (
                          <div className="space-y-1.5">
                          <label htmlFor={field.name} className="block text-sm font-semibold text-navy">
                            Animal de la finca
                          </label>
                          <select
                            id={field.name}
                            name={field.name}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700 bg-white"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                          >
                            <option value="">Seleccionar por arete</option>
                            {correccion?.detalle.criaAnimalId && !candidatos.some((animal) => animal.id === correccion.detalle.criaAnimalId) && <option value={correccion.detalle.criaAnimalId}>{correccion.detalle.criaAreteInterno || correccion.detalle.criaAnimalId} · Cría del evento original</option>}
                            {candidatos.map((animal) => (
                              <option key={animal.id} value={animal.id}>
                                {animal.areteInterno}
                                {animal.nombre ? ` · ${animal.nombre}` : ''}
                              </option>
                            ))}
                          </select>
                          </div>
                        )}
                      </form.Field>
                      <form.Subscribe selector={(state) => state.values.criaAnimalId}>
                        {(criaAnimalId) => {
                          const cria = candidatos.find((animal) => animal.id === criaAnimalId);
                          return cria && !cria.fechaNacimiento ? (
                      <form.Field name="confirmarFechaNacimiento">
                        {(field) => (
                          <label className="flex items-start gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} />
                            Confirmo que la ficha corresponde a esta cría; si no tiene fecha de nacimiento, se registrará la fecha del parto.
                          </label>
                        )}
                      </form.Field>
                          ) : null;
                        }}
                      </form.Subscribe>
                    </div>
                  )}
                </div>
              ) : null
            }
          </form.Subscribe>

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
            {mutation.isPending ? 'Guardando...' : correccion ? 'Guardar corrección' : 'Registrar parto'}
          </button>
        </div>
      </form>
    </ModalFormulario>
  );
}
