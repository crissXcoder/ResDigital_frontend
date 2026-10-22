'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery } from '@tanstack/react-query';
import { useRegistrarParto } from '@/lib/hooks/use-reproductivo';
import { getAnimales } from '@/lib/api/animales';
import { partoSchema } from '@/lib/reproductivo/schemas';
import { FACILIDADES_PARTO } from '@/lib/reproductivo/tipos';
import ModalFormulario from './ModalFormulario';

interface PartoFormProps {
  animalId: string;
  /** Precargado desde estado.servicioActivo?.eventoId — no se escribe a mano. */
  eventoServicioId?: string;
  onClose: () => void;
}

type ModoCria = 'ninguna' | 'nueva' | 'existente';

export default function PartoForm({
  animalId,
  eventoServicioId,
  onClose,
}: PartoFormProps) {
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [modoCria, setModoCria] = useState<ModoCria>('ninguna');

  // Campos para nueva cría
  const [nuevaArete, setNuevaArete] = useState('');
  const [nuevaNombre, setNuevaNombre] = useState('');
  const [nuevaSexo, setNuevaSexo] = useState<'Hembra' | 'Macho'>('Hembra');
  const [nuevaPeso, setNuevaPeso] = useState('');
  const [nuevaDiio, setNuevaDiio] = useState('');

  // Cría existente seleccionada
  const [criaExistenteId, setCriaExistenteId] = useState('');

  const mutation = useRegistrarParto(animalId);

  // Consulta crías elegibles del hato si se elige vincular cría existente
  const { data: animales = [], isLoading: isLoadingAnimales } = useQuery({
    queryKey: ['animales-candidatos-cria', animalId],
    queryFn: () => getAnimales({ activo: 'true' }),
    enabled: modoCria === 'existente',
  });

  const criasCandidatas = animales.filter(
    (a) => a.id !== animalId && !a.madreId,
  );

  const form = useForm({
    defaultValues: {
      fechaEvento: '',
      eventoServicioId: eventoServicioId ?? '',
      facilidadParto: 'Normal',
      observaciones: '',
    },
    onSubmit: async ({ value }) => {
      setErrorServidor(null);

      const esAborto = value.facilidadParto === 'Aborto';

      let criaAnimalIdPayload: string | undefined = undefined;
      let nuevaCriaPayload:
        | {
            areteInterno: string;
            nombre?: string;
            sexo?: 'Hembra' | 'Macho';
            pesoNacimientoKg?: number;
            numeroOficialDiio?: string;
          }
        | undefined = undefined;

      if (!esAborto) {
        if (modoCria === 'nueva') {
          const arete = nuevaArete.trim();
          if (!arete) {
            setErrorServidor('El arete interno de la nueva cría es obligatorio.');
            return;
          }
          nuevaCriaPayload = {
            areteInterno: arete,
            nombre: nuevaNombre.trim() || undefined,
            sexo: nuevaSexo,
            pesoNacimientoKg: nuevaPeso ? Number(nuevaPeso) : undefined,
            numeroOficialDiio: nuevaDiio.trim() || undefined,
          };
        } else if (modoCria === 'existente') {
          if (!criaExistenteId) {
            setErrorServidor('Debe seleccionar una cría de la lista o cambiar la opción a "No registrar ahora".');
            return;
          }
          criaAnimalIdPayload = criaExistenteId;
        }
      }

      try {
        await mutation.mutateAsync({
          fechaEvento: value.fechaEvento,
          eventoServicioId: value.eventoServicioId || undefined,
          criaAnimalId: criaAnimalIdPayload,
          nuevaCria: nuevaCriaPayload,
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
                  <p className="text-xs text-slate-500">
                    Cierra la preñez sin registrar cría viable en el hato.
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Sección de Registro de Cría */}
          <div className="sm:col-span-2 space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-semibold text-navy">
                Asignación de cría al parto
              </label>
              <span className="text-xs text-slate-500">
                Seleccione si desea registrar o vincular la cría ahora
              </span>
            </div>

            {form.getFieldValue('facilidadParto') === 'Aborto' ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                El desenlace seleccionado es <strong>Aborto</strong>: no se genera registro de cría en el sistema.
              </div>
            ) : (
              <>
                <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setModoCria('ninguna')}
                    className={`flex-1 py-2 px-3 text-center transition-colors ${
                      modoCria === 'ninguna'
                        ? 'bg-navy text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    No registrar ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoCria('nueva')}
                    className={`flex-1 py-2 px-3 text-center border-l border-r border-slate-300 transition-colors ${
                      modoCria === 'nueva'
                        ? 'bg-navy text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Registrar cría nueva
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoCria('existente')}
                    className={`flex-1 py-2 px-3 text-center transition-colors ${
                      modoCria === 'existente'
                        ? 'bg-navy text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Vincular existente
                  </button>
                </div>

                {modoCria === 'nueva' && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
                    <p className="text-xs text-slate-500">
                      La cría se creará atómicamente vinculada a esta madre, heredando su raza y potrero.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Arete interno de la cría *
                        </label>
                        <input
                          type="text"
                          value={nuevaArete}
                          onChange={(e) => setNuevaArete(e.target.value)}
                          placeholder="Ej: CR-2026-01"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-navy"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Nombre (opcional)
                        </label>
                        <input
                          type="text"
                          value={nuevaNombre}
                          onChange={(e) => setNuevaNombre(e.target.value)}
                          placeholder="Ej: Lucero"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-navy"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Sexo
                        </label>
                        <select
                          value={nuevaSexo}
                          onChange={(e) => setNuevaSexo(e.target.value as 'Hembra' | 'Macho')}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:ring-1 focus:ring-navy"
                        >
                          <option value="Hembra">Hembra (Ternera)</option>
                          <option value="Macho">Macho (Ternero)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Peso de nacimiento (kg, opcional)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={nuevaPeso}
                          onChange={(e) => setNuevaPeso(e.target.value)}
                          placeholder="Ej: 36.5"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-navy"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Número oficial DIIO (opcional)
                        </label>
                        <input
                          type="text"
                          value={nuevaDiio}
                          onChange={(e) => setNuevaDiio(e.target.value)}
                          placeholder="Ej: CR-12345678 (dejar en blanco si no se ha colocado)"
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-navy"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {modoCria === 'existente' && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                    <label htmlFor="criaExistenteSelect" className="block text-xs font-medium text-slate-700">
                      Seleccionar animal joven sin madre registrada
                    </label>
                    <select
                      id="criaExistenteSelect"
                      value={criaExistenteId}
                      onChange={(e) => setCriaExistenteId(e.target.value)}
                      disabled={isLoadingAnimales}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-navy text-slate-700"
                    >
                      <option value="">-- Seleccionar cría del hato --</option>
                      {criasCandidatas.map((a) => (
                        <option key={a.id} value={a.id}>
                          #{a.areteInterno} {a.nombre ? `· ${a.nombre}` : ''} ({a.categoria || a.sexo})
                        </option>
                      ))}
                    </select>
                    {criasCandidatas.length === 0 && !isLoadingAnimales && (
                      <p className="text-xs text-slate-500 italic">
                        No hay animales activos sin madre asignada disponibles en este momento.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

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
                  placeholder="Cría nacida vigorosa, parto asistido leve, etc."
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
