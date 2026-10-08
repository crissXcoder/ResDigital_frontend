'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Loader2, Droplet } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RequireRole } from '@/components/auth/RequireRole';
import ModalProduccionLeche from '@/components/modals/ModalProduccionLeche';
import type { RolUsuario } from '@/lib/hooks/useAuthUser';
import type { Pesaje } from '@/lib/api/animales';
import { formatearFecha, hoyLocal } from '@/lib/reproductivo/fechas';
import {
  ETIQUETA_DISPOSICION,
  ETIQUETA_TURNO,
  agruparProduccionPorFecha,
  anularProduccion,
  createProduccionLeche,
  finalizarLactancia,
  getEstadoLactancia,
  getProduccionByAnimal,
  iniciarLactancia,
  type ProduccionLeche,
} from '@/lib/api/produccion';

/** Anular producción e iniciar o finalizar lactancias: el peón solo registra. */
export const ROLES_GESTIONAN_PRODUCCION: RolUsuario[] = ['propietario', 'administrador'];

interface TabProduccionProps {
  animalId: string;
  animalLabel?: string;
  isMacho: boolean;
  pesajes: Pesaje[] | undefined;
  onRegistrarPesaje: () => void;
}

type AccionLactancia = 'inicio' | 'fin';

export default function TabProduccion({
  animalId,
  animalLabel,
  isMacho,
  pesajes,
  onRegistrarPesaje,
}: TabProduccionProps) {
  const queryClient = useQueryClient();
  const [isProduccionOpen, setIsProduccionOpen] = useState(false);
  const [accionLactancia, setAccionLactancia] = useState<AccionLactancia | null>(null);
  const [fechaLactancia, setFechaLactancia] = useState(hoyLocal());
  const [registroAAnular, setRegistroAAnular] = useState<ProduccionLeche | null>(null);
  const [motivo, setMotivo] = useState('');

  const { data: lactancia } = useQuery({
    queryKey: ['lactancia', animalId],
    queryFn: () => getEstadoLactancia(animalId),
    enabled: !isMacho,
  });

  const { data: produccion } = useQuery({
    queryKey: ['produccionLeche', animalId],
    queryFn: () => getProduccionByAnimal(animalId),
    enabled: !isMacho,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['produccionLeche'] });
    queryClient.invalidateQueries({ queryKey: ['lactancia'] });
  };

  const produccionMutation = useMutation({
    mutationFn: createProduccionLeche,
    onSuccess: invalidar,
  });

  const lactanciaMutation = useMutation({
    mutationFn: ({ accion, fecha }: { accion: AccionLactancia; fecha: string }) =>
      accion === 'inicio'
        ? iniciarLactancia(animalId, { fecha })
        : finalizarLactancia(animalId, { fecha }),
    onSuccess: () => {
      invalidar();
      setAccionLactancia(null);
    },
  });

  const anularMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => anularProduccion(id, motivo),
    onSuccess: () => {
      invalidar();
      setRegistroAAnular(null);
      setMotivo('');
    },
  });

  const abrirLactancia = (accion: AccionLactancia) => {
    lactanciaMutation.reset();
    setFechaLactancia(hoyLocal());
    setAccionLactancia(accion);
  };

  const curva = agruparProduccionPorFecha(produccion ?? []);
  const pesajesAsc = [...(pesajes ?? [])].reverse();
  const enLactancia = lactancia?.enLactancia === true;

  return (
    <div className="space-y-6 mt-6">
      {!isMacho && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Droplet className={`w-5 h-5 ${enLactancia ? 'text-sky-600' : 'text-slate-300'}`} />
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado de lactancia</p>
              <p className="text-sm font-bold text-navy" data-testid="estado-lactancia">
                {lactancia == null
                  ? 'Cargando…'
                  : enLactancia
                    ? `En lactancia desde ${formatearFecha(lactancia.fechaInicio)}`
                    : 'No lactante'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {enLactancia && (
              <RequireRole roles={['propietario', 'administrador', 'peon']}>
                <button
                  type="button"
                  onClick={() => setIsProduccionOpen(true)}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-sky-700 transition-colors"
                >
                  Registrar Producción
                </button>
              </RequireRole>
            )}
            {lactancia != null && (
              <RequireRole roles={ROLES_GESTIONAN_PRODUCCION}>
                <button
                  type="button"
                  onClick={() => abrirLactancia(enLactancia ? 'fin' : 'inicio')}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors"
                >
                  {enLactancia ? 'Finalizar lactancia' : 'Iniciar lactancia'}
                </button>
              </RequireRole>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isMacho && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-navy mb-4">Producción diaria (L)</h3>
            <div className="h-48 w-full">
              {curva.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {/* design-exception: Recharts requiere valores estáticos/hex para sus props */}
                  <LineChart data={curva} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="fecha" tickFormatter={(val: string) => formatearFecha(val)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelFormatter={(val) => formatearFecha(String(val))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="producidos" stroke="#0284c7" strokeWidth={3} dot={{ r: 3, fill: '#0284c7', strokeWidth: 0 }} name="Producido (L)" />
                    <Line type="monotone" dataKey="comercializables" stroke="#16a34a" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }} name="Comercializable (L)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">Sin producción registrada</div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-navy mb-4">Evolución de Peso (kg)</h3>
          <div className="h-48 w-full">
            {pesajesAsc.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {/* design-exception: Recharts requiere valores estáticos/hex para sus props */}
                <LineChart data={pesajesAsc} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" tickFormatter={(val: string) => formatearFecha(val)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelFormatter={(val) => formatearFecha(String(val))} />
                  <Line type="monotone" dataKey={(p: Pesaje) => Number(p.pesoActualKg) || 0} stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#10b981' }} name="Peso (kg)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">Sin datos de peso</div>
            )}
          </div>
        </div>
      </div>

      {!isMacho && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-navy">Historial de Producción de Leche</h3>
          </div>
          <div className="p-6 overflow-x-auto">
            {produccion && produccion.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b-2 border-slate-100">
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-left py-2">Turno</th>
                    <th className="text-right py-2">Litros</th>
                    <th className="text-left py-2 pl-4">Disposición</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {produccion.map((r) => (
                    <tr
                      key={r.id}
                      data-testid={`produccion-${r.id}`}
                      className={`border-b border-slate-100 ${r.revertido ? 'opacity-50 line-through' : ''}`}
                    >
                      <td className="py-2 text-slate-500">{formatearFecha(r.fecha)}</td>
                      <td className="py-2 text-slate-600">{ETIQUETA_TURNO[r.turno]}</td>
                      <td className="py-2 text-right font-bold text-navy">{Number(r.litros).toFixed(1)} L</td>
                      <td className="py-2 pl-4">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            r.disposicion === 'DESCARTE'
                              ? 'bg-danger-bg text-danger border border-danger/30'
                              : 'bg-green-50 text-green-700 border border-green-200'
                          }`}
                          title={
                            r.disposicion === 'DESCARTE' && r.fechaLiberacionLeche
                              ? `Retiro de leche hasta ${formatearFecha(r.fechaLiberacionLeche)}`
                              : undefined
                          }
                        >
                          {ETIQUETA_DISPOSICION[r.disposicion]}
                        </span>
                        {r.revertido && <span className="ml-2 text-xs text-slate-500 no-underline">Anulado</span>}
                      </td>
                      <td className="py-2 text-right">
                        {!r.revertido && (
                          <RequireRole roles={ROLES_GESTIONAN_PRODUCCION}>
                            <button
                              type="button"
                              onClick={() => {
                                anularMutation.reset();
                                setMotivo('');
                                setRegistroAAnular(r);
                              }}
                              className="text-slate-400 hover:text-danger transition-colors"
                              title="Anular producción"
                              aria-label="Anular producción"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </RequireRole>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">No hay producción registrada</div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy">Historial de Pesajes</h3>
          <RequireRole roles={['propietario', 'administrador', 'peon']}>
            <button
              type="button"
              onClick={onRegistrarPesaje}
              className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-bold shadow-sm hover:bg-navy-light transition-colors"
            >
              + Registrar Pesaje
            </button>
          </RequireRole>
        </div>
        <div className="p-6 space-y-2">
          {pesajes && pesajes.length > 0 ? (
            pesajes.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">{formatearFecha(p.fecha)}</span>
                <span className="text-sm font-bold text-navy">{p.pesoActualKg != null ? `${p.pesoActualKg} kg` : '-'}</span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">No hay pesajes registrados</div>
          )}
        </div>
      </div>

      <ModalProduccionLeche
        isOpen={isProduccionOpen}
        onClose={() => setIsProduccionOpen(false)}
        animalId={animalId}
        animalLabel={animalLabel}
        onSubmit={(payload) => produccionMutation.mutateAsync(payload)}
      />

      {accionLactancia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4">
          <form
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              lactanciaMutation.mutate({ accion: accionLactancia, fecha: fechaLactancia });
            }}
          >
            <div>
              <h2 className="text-lg font-bold text-navy">
                {accionLactancia === 'inicio' ? 'Iniciar lactancia' : 'Finalizar lactancia'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {accionLactancia === 'inicio'
                  ? 'Para vacas que ya se ordeñan sin parto registrado. Un parto registrado inicia la lactancia automáticamente.'
                  : 'Para una vaca no preñada que deja de ordeñarse. Si está preñada, registre el secado en el ciclo reproductivo.'}
              </p>
            </div>
            {lactanciaMutation.isError && (
              <div role="alert" className="p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-xs font-medium">
                {lactanciaMutation.error instanceof Error
                  ? lactanciaMutation.error.message
                  : 'No se pudo registrar el evento de lactancia.'}
              </div>
            )}
            <label className="block space-y-1.5">
              <span className="block text-sm font-semibold text-navy">Fecha *</span>
              <input
                type="date"
                required
                max={hoyLocal()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
                value={fechaLactancia}
                onChange={(e) => setFechaLactancia(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAccionLactancia(null)}
                disabled={lactanciaMutation.isPending}
                className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={lactanciaMutation.isPending}
                className="px-5 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy-light shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {lactanciaMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </form>
        </div>
      )}

      {registroAAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4">
          <form
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              anularMutation.mutate({ id: registroAAnular.id, motivo: motivo.trim() });
            }}
          >
            <div>
              <h2 className="text-lg font-bold text-navy">Anular producción</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {ETIQUETA_TURNO[registroAAnular.turno]} del {formatearFecha(registroAAnular.fecha)} — {Number(registroAAnular.litros).toFixed(1)} L. El registro se conserva en el historial y deja de contar en los totales.
              </p>
            </div>
            {anularMutation.isError && (
              <div role="alert" className="p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-xs font-medium">
                {anularMutation.error instanceof Error ? anularMutation.error.message : 'No se pudo anular la producción.'}
              </div>
            )}
            <label className="block space-y-1.5">
              <span className="block text-sm font-semibold text-navy">Motivo *</span>
              <textarea
                required
                minLength={3}
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="ej. Litros mal digitados"
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRegistroAAnular(null)}
                disabled={anularMutation.isPending}
                className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={anularMutation.isPending || motivo.trim().length < 3}
                className="px-5 py-2 bg-danger text-white rounded-lg text-sm font-semibold hover:bg-danger/90 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {anularMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Anular
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
