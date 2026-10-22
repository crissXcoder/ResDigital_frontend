'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2, Save } from 'lucide-react';
import { getAnimales, type Animal } from '@/lib/api/animales';
import { getEstadoSanitario } from '@/lib/api/sanitary';
import {
  createProduccionLeche,
  getHembrasEnLactancia,
  getProduccionByAnimal,
  getResumenProduccion,
  MAX_LITROS_TURNO,
  toCreateProduccionPayload,
  type ProduccionLeche,
  type TurnoOrdeno,
} from '@/lib/api/produccion';
import { formatearFecha, hoyLocal } from '@/lib/reproductivo/fechas';
import { RequireRole } from '@/components/auth/RequireRole';

type Turnos = { MANANA: string; TARDE: string };
const VACIO: Turnos = { MANANA: '', TARDE: '' };
const SUMAR = (registros: ProduccionLeche[], turno?: TurnoOrdeno) =>
  registros.filter((r) => !r.revertido && (!turno || r.turno === turno))
    .reduce((total, r) => total + Number(r.litros), 0);
const LITROS = (n: number) => `${n.toFixed(1)} L`;

function inicioRango(fecha: string) {
  const dia = new Date(`${fecha}T12:00:00Z`);
  if (Number.isNaN(dia.getTime())) return fecha;
  dia.setUTCDate(dia.getUTCDate() - 29);
  return dia.toISOString().slice(0, 10);
}

export default function ProduccionPage() {
  const queryClient = useQueryClient();
  const [fecha, setFecha] = useState(hoyLocal());
  const [valores, setValores] = useState<Record<string, Turnos>>({});
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const hoy = hoyLocal();
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha <= hoy;

  const animalesQuery = useQuery({ queryKey: ['animales', 'produccion'], queryFn: () => getAnimales() });
  const animales = useMemo(
    () => (animalesQuery.data ?? []).filter((animal) => animal.activo && animal.sexo === 'Hembra'),
    [animalesQuery.data],
  );
  const lactanciaQuery = useQuery({
    queryKey: ['lactancia', 'activas', fecha],
    queryFn: () => getHembrasEnLactancia(fecha),
    enabled: fechaValida,
  });
  const resumenQuery = useQuery({
    queryKey: ['produccionResumen', inicioRango(fecha), fecha],
    queryFn: () => getResumenProduccion(inicioRango(fecha), fecha),
    enabled: fechaValida,
  });
  const registrosQueries = useQueries({
    queries: animales.map((animal) => ({
      queryKey: ['produccionLeche', animal.id],
      queryFn: () => getProduccionByAnimal(animal.id),
    })),
  });
  const sanitarioQueries = useQueries({
    queries: animales.map((animal) => ({
      queryKey: ['estadoSanitario', animal.id, fecha],
      queryFn: () => getEstadoSanitario(animal.id, fecha),
      enabled: fechaValida,
    })),
  });
  const cargando = animalesQuery.isLoading || lactanciaQuery.isLoading ||
    registrosQueries.some((q) => q.isLoading) || sanitarioQueries.some((q) => q.isLoading);
  const fallo = animalesQuery.isError || lactanciaQuery.isError || resumenQuery.isError ||
    registrosQueries.some((q) => q.isError) || sanitarioQueries.some((q) => q.isError);
  const lactantes = new Set((lactanciaQuery.data ?? []).map((a) => a.animalId));
  const filas = animales.map((animal, index) => {
    const registros = (registrosQueries[index]?.data ?? []).filter((r) => r.fecha === fecha && !r.revertido);
    const sanitario = sanitarioQueries[index]?.data;
    const retiro = !!sanitario?.liberacionLeche &&
      sanitario.liberacionLeche >= fecha &&
      (!sanitario.tratamientoReferencia?.fechaAplicacion ||
        sanitario.tratamientoReferencia.fechaAplicacion <= fecha);
    return { animal, registros, retiro, lactante: lactantes.has(animal.id) };
  });
  const guardados = filas.flatMap((fila) => fila.registros);
  const bloqueadas = filas.filter((fila) => fila.retiro).length;
  const pendientes = filas.flatMap(({ animal, registros, retiro, lactante }) =>
    (['MANANA', 'TARDE'] as const).flatMap((turno) => {
      const texto = valores[animal.id]?.[turno] ?? '';
      return !retiro && lactante && !registros.some((r) => r.turno === turno) && texto !== ''
        ? [{ animal, turno, texto }] : [];
    }),
  );
  const pendientePorTurno = (turno: TurnoOrdeno) =>
    pendientes.filter((p) => p.turno === turno).reduce((n, p) => n + (Number(p.texto) || 0), 0);
  const manana = SUMAR(guardados, 'MANANA') + pendientePorTurno('MANANA');
  const tarde = SUMAR(guardados, 'TARDE') + pendientePorTurno('TARDE');
  const ranking = filas.map(({ animal }, index) => ({
    animal,
    litros: SUMAR((registrosQueries[index]?.data ?? []).filter((r) => r.fecha >= inicioRango(fecha) && r.fecha <= fecha)),
  })).sort((a, b) => b.litros - a.litros).slice(0, 4);
  const grafica = resumenQuery.data?.porFecha ?? [];

  const cambiarFecha = (nueva: string) => {
    setFecha(nueva);
    setValores({});
    setError('');
    setMensaje('');
  };
  const cambiarLitros = (animalId: string, turno: TurnoOrdeno, texto: string) => {
    setValores((actual) => ({
      ...actual,
      [animalId]: { ...(actual[animalId] ?? VACIO), [turno]: texto },
    }));
    setError('');
    setMensaje('');
  };
  const guardar = async () => {
    setError('');
    setMensaje('');
    if (!fechaValida || fallo || cargando) return;
    if (pendientes.length === 0) {
      setError('Ingrese al menos un ordeño nuevo para guardar.');
      return;
    }
    if (pendientes.some(({ texto }) => !Number.isFinite(Number(texto)) || Number(texto) <= 0 ||
      Number(texto) > MAX_LITROS_TURNO || !/^\d+(\.\d)?$/.test(texto))) {
      setError(`Cada turno debe tener entre 0.1 y ${MAX_LITROS_TURNO} litros, con un decimal como máximo.`);
      return;
    }
    setGuardando(true);
    let guardadosAhora = 0;
    try {
      for (const { animal, turno, texto } of pendientes) {
        await createProduccionLeche(toCreateProduccionPayload({
          animalId: animal.id, fecha, turno, litros: texto,
        }));
        guardadosAhora++;
        setValores((actual) => ({
          ...actual,
          [animal.id]: { ...(actual[animal.id] ?? VACIO), [turno]: '' },
        }));
        await queryClient.invalidateQueries({ queryKey: ['produccionLeche', animal.id] });
      }
      setMensaje(`${guardadosAhora} ordeño(s) guardado(s) correctamente.`);
    } catch (cause) {
      setError(`Se guardaron ${guardadosAhora} ordeño(s). ${cause instanceof Error ? cause.message : 'No se pudo completar el registro.'}`);
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['produccionResumen'] });
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-5 md:p-7">
      <div className="mx-auto max-w-7xl space-y-5">
        <header>
          <h1 className="text-2xl font-extrabold text-navy">Producción Lechera</h1>
          <p className="mt-1 text-sm text-slate-500">Registro diario de litros por vaca. Las hembras en retiro sanitario se muestran bloqueadas.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['PRODUCCIÓN TOTAL', LITROS(manana + tarde), 'text-navy', 'Mañana + Tarde'],
            ['ORDEÑO MAÑANA', LITROS(manana), 'text-emerald-600', 'Turno AM'],
            ['ORDEÑO TARDE', LITROS(tarde), 'text-amber-600', 'Turno PM'],
            ['VACAS BLOQUEADAS', String(bloqueadas), 'text-red-600', 'En retiro de leche'],
          ].map(([titulo, valor, color, pie]) => (
            <div key={titulo} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-bold tracking-wide text-slate-500">{titulo}</p>
              <p className={`mt-2 text-3xl font-extrabold ${color}`}>{cargando ? '…' : valor}</p>
              <p className="text-xs text-slate-400">{pie}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
              <div><h2 className="font-bold text-navy">Registro Diario</h2><p className="text-xs text-slate-500">Litros por vaca para la fecha seleccionada</p></div>
              <input aria-label="Fecha de producción" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" type="date" max={hoy} value={fecha} onChange={(event) => cambiarFecha(event.target.value)} />
            </div>
            {error && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {mensaje && <p role="status" className="m-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{mensaje}</p>}
            {!fechaValida ? <p className="p-8 text-center text-red-600">Seleccione una fecha válida que no sea futura.</p> :
              cargando ? <p className="flex items-center justify-center gap-2 p-10 text-slate-500"><Loader2 size={18} className="animate-spin" /> Cargando producción…</p> :
              fallo ? <p className="p-10 text-center text-red-600">No se pudieron cargar todos los datos de producción y sanidad.</p> :
              filas.length === 0 ? <p className="p-10 text-center text-slate-500">No hay hembras activas.</p> :
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr>
                    <th className="p-3 text-left">Animal</th><th className="p-3 text-left">Raza</th>
                    <th className="p-3 text-center">Mañana (L)</th><th className="p-3 text-center">Tarde (L)</th>
                    <th className="p-3 text-center">Total (L)</th><th className="p-3 text-center">Estado</th>
                  </tr></thead>
                  <tbody>{filas.map(({ animal, registros, retiro, lactante }) => {
                    const total = SUMAR(registros) +
                      (retiro || !lactante ? 0 : (Number(valores[animal.id]?.MANANA) || 0) + (Number(valores[animal.id]?.TARDE) || 0));
                    return <tr key={animal.id} className={`border-t border-slate-100 ${retiro ? 'bg-red-50/70' : ''}`}>
                      <td className="p-3"><Link href={`/hato/${animal.id}?tab=produccion`} className="font-bold text-navy hover:text-sky-700">#{animal.areteInterno}</Link><span className="block text-xs text-slate-500">{animal.nombre || 'Sin nombre'}</span></td>
                      <td className="p-3 text-xs text-slate-500">{animal.raza?.nombre || animal.razaOtra || 'Sin raza'}</td>
                      {(['MANANA', 'TARDE'] as const).map((turno) => {
                        const registro = registros.find((r) => r.turno === turno);
                        return <td key={turno} className="p-2 text-center">{registro ?
                          <span className="font-semibold text-navy">{LITROS(Number(registro.litros))}{registro.disposicion === 'DESCARTE' && <small className="block text-red-600">Descarte</small>}</span> :
                          retiro || !lactante ? <span className="text-red-500">—</span> :
                          <input aria-label={`${turno === 'MANANA' ? 'Mañana' : 'Tarde'} ${animal.areteInterno}`} className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-center" type="number" min="0.1" max={MAX_LITROS_TURNO} step="0.1" placeholder="0.0" value={valores[animal.id]?.[turno] ?? ''} onChange={(event) => cambiarLitros(animal.id, turno, event.target.value)} />}</td>;
                      })}
                      <td className="p-3 text-center font-bold text-navy">{total ? LITROS(total) : '—'}</td>
                      <td className="p-3 text-center"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${retiro ? 'bg-red-100 text-red-700' : lactante ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{retiro ? 'BLOQUEADA' : lactante ? 'APTA' : 'SIN LACTANCIA'}</span></td>
                    </tr>;
                  })}</tbody>
                  <tfoot><tr className="border-t-2 border-slate-100 font-bold"><td colSpan={2} className="p-4">TOTAL DEL DÍA</td><td className="text-center text-emerald-600">{LITROS(manana)}</td><td className="text-center text-amber-600">{LITROS(tarde)}</td><td className="text-center text-navy">{LITROS(manana + tarde)}</td><td /></tr></tfoot>
                </table>
              </div>}
            <RequireRole roles={['propietario', 'administrador', 'peon']}>
              <div className="flex justify-end border-t border-slate-100 p-4"><button type="button" onClick={guardar} disabled={guardando || cargando || fallo || !fechaValida || pendientes.length === 0} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar producción del día</button></div>
            </RequireRole>
          </section>
          <aside className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold text-navy">Producción General (L/día)</h2>
            <div className="mt-5 h-48">{grafica.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={grafica}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="fecha" tickFormatter={formatearFecha} tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip labelFormatter={(value) => formatearFecha(String(value))} formatter={(value) => [LITROS(Number(value)), 'Producido']} /><Bar dataKey="litrosProducidos" fill="#1e3a5f" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center text-xs text-slate-400">Sin registros en los últimos 30 días</p>}</div>
            <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-bold uppercase text-slate-400">Top productoras · 30 días</h3>{ranking.map(({ animal, litros }, index) => <div key={animal.id} className="mt-3 flex justify-between gap-2 text-xs"><Link href={`/hato/${animal.id}?tab=produccion`} className="font-semibold text-navy hover:text-sky-700">{index + 1}. #{animal.areteInterno} {animal.nombre}</Link><span>{LITROS(litros)}</span></div>)}</div>
          </aside>
        </div>
      </div>
    </main>
  );
}
