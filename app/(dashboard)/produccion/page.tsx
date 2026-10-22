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
import { formatearFecha, hoyLocal, normalizarFechaCivil, sumarDiasCivil } from '@/lib/reproductivo/fechas';
import { RequireRole } from '@/components/auth/RequireRole';

type Turnos = { MANANA: string; TARDE: string };
const VACIO: Turnos = { MANANA: '', TARDE: '' };
const SUMAR = (registros: ProduccionLeche[], turno?: TurnoOrdeno) =>
  registros.filter((r) => !r.revertido && (!turno || r.turno === turno))
    .reduce((total, r) => total + Number(r.litros), 0);
const LITROS = (n: number) => `${n.toFixed(1)} L`;

export default function ProduccionPage() {
  const queryClient = useQueryClient();
  const [fecha, setFecha] = useState(hoyLocal());
  const [valores, setValores] = useState<Record<string, Turnos>>({});
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [periodo, setPeriodo] = useState('30');
  const [desdeManual, setDesdeManual] = useState(sumarDiasCivil(hoyLocal(), -29) ?? hoyLocal());
  const [hastaManual, setHastaManual] = useState(hoyLocal());
  const [animalHistorial, setAnimalHistorial] = useState('');
  const [disposicionHistorial, setDisposicionHistorial] = useState('');
  const [limiteHistorial, setLimiteHistorial] = useState(25);
  const hoy = hoyLocal();
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha <= hoy;
  const desde = periodo === 'personalizado' ? desdeManual : sumarDiasCivil(fecha, 1 - Number(periodo)) ?? fecha;
  const hasta = periodo === 'personalizado' ? hastaManual : fecha;
  const rangoValido = !!normalizarFechaCivil(desde) && !!normalizarFechaCivil(hasta) &&
    desde <= hasta && hasta <= hoy;

  const animalesQuery = useQuery({ queryKey: ['animales', 'produccion'], queryFn: () => getAnimales() });
  const hembras = useMemo(
    () => (animalesQuery.data ?? []).filter((animal) => animal.sexo === 'Hembra'),
    [animalesQuery.data],
  );
  const animales = hembras.filter((animal) => animal.activo);
  const lactanciaQuery = useQuery({
    queryKey: ['lactancia', 'activas', fecha],
    queryFn: () => getHembrasEnLactancia(fecha),
    enabled: fechaValida,
  });
  const resumenQuery = useQuery({
    queryKey: ['produccionResumen', desde, hasta],
    queryFn: () => getResumenProduccion(desde, hasta),
    enabled: rangoValido,
  });
  const registrosQueries = useQueries({
    queries: hembras.map((animal) => ({
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
  const fallo = animalesQuery.isError || lactanciaQuery.isError ||
    registrosQueries.some((q) => q.isError) || sanitarioQueries.some((q) => q.isError);
  const lactantes = new Set((lactanciaQuery.data ?? []).map((a) => a.animalId));
  const registrosPorAnimal = new Map(hembras.map((animal, index) =>
    [animal.id, registrosQueries[index]?.data ?? []] as const));
  const filas = animales.map((animal, index) => {
    const registros = (registrosPorAnimal.get(animal.id) ?? []).filter((r) => r.fecha === fecha && !r.revertido);
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
  const ranking = hembras.map((animal) => ({
    animal,
    litros: SUMAR((registrosPorAnimal.get(animal.id) ?? []).filter((r) => r.fecha >= desde && r.fecha <= hasta)),
  })).sort((a, b) => b.litros - a.litros).slice(0, 4);
  const grafica = rangoValido ? resumenQuery.data?.porFecha ?? [] : [];
  const historial = rangoValido ? hembras.flatMap((animal) =>
    (registrosPorAnimal.get(animal.id) ?? [])
      .filter((registro) => !registro.revertido && registro.fecha >= desde && registro.fecha <= hasta)
      .filter((registro) => !animalHistorial || animal.id === animalHistorial)
      .filter((registro) => !disposicionHistorial || registro.disposicion === disposicionHistorial)
      .map((registro) => ({ animal, registro })),
  ).sort((a, b) => b.registro.fecha.localeCompare(a.registro.fecha) ||
    a.animal.areteInterno.localeCompare(b.animal.areteInterno)) : [];

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
            <div className="mt-4 space-y-2">
              <label htmlFor="periodo-produccion" className="block text-xs font-semibold text-slate-500">Período del gráfico, ranking e historial</label>
              <select id="periodo-produccion" value={periodo} onChange={(event) => setPeriodo(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy">
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="90">Últimos 90 días</option>
                <option value="personalizado">Rango personalizado</option>
              </select>
              {periodo === 'personalizado' && <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">Desde<input aria-label="Histórico desde" type="date" max={hoy} value={desdeManual} onChange={(event) => setDesdeManual(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs" /></label>
                <label className="text-xs text-slate-500">Hasta<input aria-label="Histórico hasta" type="date" max={hoy} value={hastaManual} onChange={(event) => setHastaManual(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs" /></label>
              </div>}
              {periodo !== 'personalizado' && <p className="text-xs text-slate-400">Hasta el {formatearFecha(fecha)} seleccionado en Registro Diario</p>}
              {!rangoValido && <p role="alert" className="text-xs text-red-600">Elija un rango válido, en orden y sin fechas futuras.</p>}
            </div>
            <div className="mt-5 h-48">{rangoValido && resumenQuery.isLoading ? <p className="flex h-full items-center justify-center text-xs text-slate-400">Cargando histórico…</p> : resumenQuery.isError ? <p className="flex h-full items-center justify-center text-xs text-red-600">No se pudo cargar el histórico.</p> : grafica.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={grafica}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="fecha" tickFormatter={formatearFecha} minTickGap={20} tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip labelFormatter={(value) => formatearFecha(String(value))} formatter={(value) => [LITROS(Number(value)), 'Producido']} /><Bar dataKey="litrosProducidos" fill="#1e3a5f" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center text-xs text-slate-400">Sin registros en el período seleccionado</p>}</div>
            {rangoValido && resumenQuery.data && <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500"><span>Total: <strong className="text-navy">{LITROS(Number(resumenQuery.data.litrosProducidos))}</strong></span><span>Comercializable: <strong className="text-emerald-700">{LITROS(Number(resumenQuery.data.litrosComercializables))}</strong></span><span>Descarte: <strong className="text-red-600">{LITROS(Number(resumenQuery.data.litrosDescarte))}</strong></span></div>}
            <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-bold uppercase text-slate-400">Top productoras · {rangoValido ? `${formatearFecha(desde)}–${formatearFecha(hasta)}` : 'sin período'}</h3>{rangoValido && !registrosQueries.some((q) => q.isLoading || q.isError) && ranking.map(({ animal, litros }, index) => <div key={animal.id} className="mt-3 flex justify-between gap-2 text-xs"><Link href={`/hato/${animal.id}?tab=produccion`} className="font-semibold text-navy hover:text-sky-700">{index + 1}. #{animal.areteInterno} {animal.nombre}</Link><span>{LITROS(litros)}</span></div>)}</div>
          </aside>
        </div>
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5">
            <div><h2 className="font-bold text-navy">Historial del período</h2><p className="text-xs text-slate-500">{rangoValido ? `${formatearFecha(desde)} al ${formatearFecha(hasta)}` : 'Seleccione un rango válido en Producción General'}</p></div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Filtrar historial por vaca" value={animalHistorial} onChange={(event) => { setAnimalHistorial(event.target.value); setLimiteHistorial(25); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy">
                <option value="">Todas las vacas</option>
                {hembras.map((animal) => <option key={animal.id} value={animal.id}>#{animal.areteInterno} {animal.nombre}</option>)}
              </select>
              <select aria-label="Filtrar historial por disposición" value={disposicionHistorial} onChange={(event) => { setDisposicionHistorial(event.target.value); setLimiteHistorial(25); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy">
                <option value="">Toda la leche</option><option value="COMERCIALIZABLE">Comercializable</option><option value="DESCARTE">Descarte</option>
              </select>
            </div>
          </div>
          {rangoValido && !registrosQueries.some((q) => q.isLoading || q.isError) && historial.length > 0 ? <>
            <div className="overflow-x-auto"><table aria-label="Historial de producción" className="w-full min-w-[580px] text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Animal</th><th className="p-3 text-left">Turno</th><th className="p-3 text-right">Litros</th><th className="p-3 text-left">Disposición</th></tr></thead><tbody>{historial.slice(0, limiteHistorial).map(({ animal, registro }) => <tr key={registro.id} className="border-t border-slate-100"><td className="p-3">{formatearFecha(registro.fecha)}</td><td className="p-3"><Link className="font-semibold text-navy hover:text-sky-700" href={`/hato/${animal.id}?tab=produccion`}>#{animal.areteInterno} {animal.nombre}</Link></td><td className="p-3">{registro.turno === 'MANANA' ? 'Mañana' : 'Tarde'}</td><td className="p-3 text-right font-semibold">{LITROS(Number(registro.litros))}</td><td className="p-3">{registro.disposicion === 'DESCARTE' ? 'Descarte' : 'Comercializable'}</td></tr>)}</tbody></table></div>
            {historial.length > limiteHistorial && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => setLimiteHistorial((n) => n + 25)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-navy">Mostrar más ({historial.length - limiteHistorial} restantes)</button></div>}
          </> : <p className="p-8 text-center text-sm text-slate-500">{registrosQueries.some((q) => q.isLoading) ? 'Cargando historial…' : registrosQueries.some((q) => q.isError) ? 'No se pudo cargar el historial.' : 'No hay registros para estos filtros.'}</p>}
        </section>
      </div>
    </main>
  );
}
