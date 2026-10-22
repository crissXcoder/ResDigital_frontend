'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Check, Edit2, Loader2, Save, Upload, X } from 'lucide-react';
import { getAnimales } from '@/lib/api/animales';
import { getRetirosActivos } from '@/lib/api/sanitary';
import {
  createProduccionLeche,
  getHembrasEnLactancia,
  getProduccionRegistros,
  getResumenProduccion,
  updateProduccionLeche,
  MAX_LITROS_TURNO,
  toCreateProduccionPayload,
  type ProduccionLeche,
  type TurnoOrdeno,
} from '@/lib/api/produccion';
import { formatearFecha, hoyLocal, normalizarFechaCivil, sumarDiasCivil } from '@/lib/reproductivo/fechas';
import { RequireRole } from '@/components/auth/RequireRole';
import ModalCargaMasivaProduccion from '@/components/modals/ModalCargaMasivaProduccion';

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
  const [limiteHistorial, setLimiteHistorial] = useState(25);
  const [filtroDiario, setFiltroDiario] = useState('por-registrar');
  const [busquedaDiaria, setBusquedaDiaria] = useState('');
  const [paginaDiaria, setPaginaDiaria] = useState(1);
  const [isCargaMasivaOpen, setIsCargaMasivaOpen] = useState(false);
  const [editandoRegistroId, setEditandoRegistroId] = useState<string | null>(null);
  const [editandoLitros, setEditandoLitros] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
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
  const produccionDiariaQuery = useQuery({
    queryKey: ['produccionRegistros', fecha, fecha],
    queryFn: () => getProduccionRegistros(fecha, fecha),
    enabled: fechaValida,
  });
  const produccionHistoricaQuery = useQuery({
    queryKey: ['produccionRegistros', desde, hasta],
    queryFn: () => getProduccionRegistros(desde, hasta),
    enabled: rangoValido,
  });
  const retirosQuery = useQuery({
    queryKey: ['retirosActivos', fecha],
    queryFn: () => getRetirosActivos(fecha),
    enabled: fechaValida,
  });
  const cargando = animalesQuery.isLoading || lactanciaQuery.isLoading ||
    produccionDiariaQuery.isLoading || retirosQuery.isLoading;
  const fallo = animalesQuery.isError || lactanciaQuery.isError ||
    produccionDiariaQuery.isError || retirosQuery.isError;
  const lactantes = new Set((lactanciaQuery.data ?? []).map((a) => a.animalId));
  const retirosPorAnimal = new Map((retirosQuery.data ?? []).map((retiro) => [retiro.animalId, retiro] as const));
  const registrosPorAnimal = new Map<string, ProduccionLeche[]>();
  for (const registro of produccionDiariaQuery.data ?? []) {
    const lista = registrosPorAnimal.get(registro.animalId) ?? [];
    lista.push(registro);
    registrosPorAnimal.set(registro.animalId, lista);
  }
  const filas = animales.map((animal) => {
    const registros = registrosPorAnimal.get(animal.id) ?? [];
    const sanitario = retirosPorAnimal.get(animal.id);
    const retiro = !!sanitario?.fechaLiberacionLeche &&
      sanitario.fechaLiberacionLeche > fecha &&
      (!sanitario.tratamientoReferencia?.fechaAplicacion ||
        sanitario.tratamientoReferencia.fechaAplicacion <= fecha);
    return {
      animal,
      registros,
      retiro,
      fechaLiberacion: sanitario?.fechaLiberacionLeche ?? null,
      lactante: lactantes.has(animal.id),
    };
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
  const registrosHistoricosPorAnimal = new Map<string, ProduccionLeche[]>();
  for (const registro of produccionHistoricaQuery.data ?? []) {
    const lista = registrosHistoricosPorAnimal.get(registro.animalId) ?? [];
    lista.push(registro);
    registrosHistoricosPorAnimal.set(registro.animalId, lista);
  }
  const ranking = hembras.map((animal) => ({
    animal,
    litros: SUMAR(registrosHistoricosPorAnimal.get(animal.id) ?? []),
  })).sort((a, b) => b.litros - a.litros).slice(0, 4);
  const grafica = rangoValido ? resumenQuery.data?.porFecha ?? [] : [];
  const historial = rangoValido ? hembras.flatMap((animal) =>
    (registrosHistoricosPorAnimal.get(animal.id) ?? [])
      .filter((registro) => !registro.revertido && registro.fecha >= desde && registro.fecha <= hasta)
      .filter((registro) => !animalHistorial || animal.id === animalHistorial)
      .map((registro) => ({ animal, registro })),
  ).sort((a, b) => b.registro.fecha.localeCompare(a.registro.fecha) ||
    a.animal.areteInterno.localeCompare(b.animal.areteInterno)) : [];
  const filasFiltradas = filas.filter(({ animal, registros, retiro, lactante }) => {
    const busca = busquedaDiaria.trim().toLowerCase().replace(/^#/, '');
    const coincide = !busca || animal.areteInterno.toLowerCase().includes(busca) ||
      (animal.nombre ?? '').toLowerCase().includes(busca);
    if (!coincide) return false;
    const porRegistrar = lactante && !retiro && registros.length < 2;
    if (filtroDiario === 'por-registrar') return porRegistrar;
    if (filtroDiario === 'aptas') return lactante && !retiro;
    if (filtroDiario === 'bloqueadas') return retiro;
    if (filtroDiario === 'sin-lactancia') return !retiro && !lactante;
    return true;
  });
  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / 10));
  const paginaActual = Math.min(paginaDiaria, totalPaginas);
  const filasPagina = filasFiltradas.slice((paginaActual - 1) * 10, paginaActual * 10);

  const cambiarFecha = (nueva: string) => {
    setFecha(nueva);
    setValores({});
    setPaginaDiaria(1);
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

  const iniciarEdicion = (registro: ProduccionLeche) => {
    setEditandoRegistroId(registro.id);
    setEditandoLitros(String(registro.litros));
    setError('');
    setMensaje('');
  };

  const cancelarEdicion = () => {
    setEditandoRegistroId(null);
    setEditandoLitros('');
  };

  const guardarEdicion = async (registroId: string, animalId: string) => {
    const texto = editandoLitros.trim();
    if (!Number.isFinite(Number(texto)) || Number(texto) <= 0 ||
      Number(texto) > MAX_LITROS_TURNO || !/^\d+(\.\d)?$/.test(texto)) {
      setError(`Los litros deben estar entre 0.1 y ${MAX_LITROS_TURNO}, con un decimal como máximo.`);
      return;
    }
    setGuardandoEdicion(true);
    setError('');
    try {
      await updateProduccionLeche(registroId, {
        litros: Math.round(Number(texto) * 10) / 10,
      });
      setEditandoRegistroId(null);
      setEditandoLitros('');
      setMensaje('Registro de producción actualizado correctamente.');
      await queryClient.invalidateQueries({ queryKey: ['produccionRegistros'] });
      await queryClient.invalidateQueries({ queryKey: ['produccionResumen'] });
      await queryClient.invalidateQueries({ queryKey: ['produccionLeche', animalId] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el registro.');
    } finally {
      setGuardandoEdicion(false);
    }
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
      await queryClient.invalidateQueries({ queryKey: ['produccionRegistros'] });
      await queryClient.invalidateQueries({ queryKey: ['produccionResumen'] });
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-5 md:p-7">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Producción Lechera</h1>
            <p className="mt-1 text-sm text-slate-500">Registro diario de litros por vaca. Las hembras en retiro sanitario se muestran bloqueadas.</p>
          </div>
          <RequireRole roles={['propietario', 'administrador', 'peon']}>
            <button
              type="button"
              onClick={() => setIsCargaMasivaOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              <Upload className="h-4 w-4 text-slate-500" />
              Carga masiva (CSV)
            </button>
          </RequireRole>
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
            <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
              <input aria-label="Buscar vaca para registro" type="search" value={busquedaDiaria} onChange={(event) => { setBusquedaDiaria(event.target.value); setPaginaDiaria(1); }} placeholder="Buscar por arete o nombre" className="min-w-[190px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <select aria-label="Filtrar vacas para registro" value={filtroDiario} onChange={(event) => { setFiltroDiario(event.target.value); setPaginaDiaria(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy">
                <option value="por-registrar">Para registrar</option>
                <option value="aptas">Todas las aptas</option>
                <option value="todas">Todas las vacas</option>
                <option value="bloqueadas">En retiro de leche</option>
                <option value="sin-lactancia">Sin lactancia</option>
              </select>
            </div>
            {error && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {mensaje && <p role="status" className="m-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{mensaje}</p>}
            {!fechaValida ? <p className="p-8 text-center text-red-600">Seleccione una fecha válida que no sea futura.</p> :
              cargando ? <p className="flex items-center justify-center gap-2 p-10 text-slate-500"><Loader2 size={18} className="animate-spin" /> Cargando producción…</p> :
              fallo ? <p className="p-10 text-center text-red-600">No se pudieron cargar todos los datos de producción y sanidad.</p> :
              filas.length === 0 ? <p className="p-10 text-center text-slate-500">No hay hembras activas.</p> :
              filasFiltradas.length === 0 ? <p className="p-10 text-center text-slate-500">No hay vacas que coincidan con el filtro y la fecha seleccionada.</p> :
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr>
                    <th className="p-3 text-left">Animal</th><th className="p-3 text-left">Raza</th>
                    <th className="p-3 text-center">Mañana (L)</th><th className="p-3 text-center">Tarde (L)</th>
                    <th className="p-3 text-center">Total (L)</th><th className="p-3 text-center">Estado</th>
                  </tr></thead>
                  <tbody>{filasPagina.map(({ animal, registros, retiro, fechaLiberacion, lactante }) => {
                    const total = SUMAR(registros) +
                      (retiro || !lactante ? 0 : (Number(valores[animal.id]?.MANANA) || 0) + (Number(valores[animal.id]?.TARDE) || 0));
                    return <tr key={animal.id} className={`border-t border-slate-100 ${retiro ? 'bg-amber-50/40' : ''}`}>
                      <td className="p-3"><Link href={`/hato/${animal.id}?tab=produccion`} className="font-bold text-navy hover:text-sky-700">#{animal.areteInterno}</Link><span className="block text-xs text-slate-500">{animal.nombre || 'Sin nombre'}</span></td>
                      <td className="p-3 text-xs text-slate-500">{animal.raza?.nombre || animal.razaOtra || 'Sin raza'}</td>
                      {(['MANANA', 'TARDE'] as const).map((turno) => {
                        const registro = registros.find((r) => r.turno === turno);
                        const enEdicion = registro && editandoRegistroId === registro.id;
                        return <td key={turno} className="p-2 text-center">{registro ? (
                          enEdicion ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                aria-label={`Editar ${turno === 'MANANA' ? 'Mañana' : 'Tarde'} ${animal.areteInterno}`}
                                className="w-20 rounded border border-sky-400 px-1.5 py-1 text-center text-sm font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-sky-500"
                                type="number"
                                min="0.1"
                                max={MAX_LITROS_TURNO}
                                step="0.1"
                                value={editandoLitros}
                                disabled={guardandoEdicion}
                                onChange={(e) => setEditandoLitros(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void guardarEdicion(registro.id, animal.id);
                                  if (e.key === 'Escape') cancelarEdicion();
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                title="Guardar cambios"
                                aria-label="Confirmar edición"
                                onClick={() => void guardarEdicion(registro.id, animal.id)}
                                disabled={guardandoEdicion}
                                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                              >
                                {guardandoEdicion ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              </button>
                              <button
                                type="button"
                                title="Cancelar"
                                aria-label="Cancelar edición"
                                onClick={cancelarEdicion}
                                disabled={guardandoEdicion}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="group inline-flex items-center justify-center gap-1.5">
                              <div>
                                <span className="font-semibold text-navy">{LITROS(Number(registro.litros))}</span>
                              </div>
                              <RequireRole roles={['propietario', 'administrador', 'peon']}>
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicion(registro)}
                                  title={`Modificar litros de ${turno === 'MANANA' ? 'mañana' : 'tarde'}`}
                                  aria-label={`Modificar ${turno === 'MANANA' ? 'Mañana' : 'Tarde'} ${animal.areteInterno}`}
                                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded p-1 text-slate-400 hover:text-navy hover:bg-slate-100 transition"
                                >
                                  <Edit2 size={13} />
                                </button>
                              </RequireRole>
                            </div>
                          )
                        ) : retiro ? (
                            <span
                              title={`En retiro sanitario hasta el ${fechaLiberacion ? formatearFecha(fechaLiberacion) : 'próximos días'}. No comercializar.`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100/70 border border-amber-200/80 rounded-md px-2 py-1 cursor-help"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Retiro
                            </span>
                          ) : !lactante ? <span className="text-slate-400">—</span> :
                          <input aria-label={`${turno === 'MANANA' ? 'Mañana' : 'Tarde'} ${animal.areteInterno}`} className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-center" type="number" min="0.1" max={MAX_LITROS_TURNO} step="0.1" placeholder="0.0" value={valores[animal.id]?.[turno] ?? ''} onChange={(event) => cambiarLitros(animal.id, turno, event.target.value)} />}</td>;
                      })}
                      <td className="p-3 text-center font-bold text-navy">{total ? LITROS(total) : '—'}</td>
                      <td className="p-3 text-center">
                        {retiro ? (
                          <span
                            title={`Retiro activo hasta el ${fechaLiberacion ? formatearFecha(fechaLiberacion) : 'próximos días'}`}
                            className="inline-flex flex-col items-center rounded-lg px-2.5 py-1 text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                          >
                            <span>BLOQUEADA</span>
                            {fechaLiberacion && (
                              <span className="text-[10px] font-normal text-amber-700">
                                Hasta {formatearFecha(fechaLiberacion)}
                              </span>
                            )}
                          </span>
                        ) : lactante ? (
                          <span className="rounded-full px-2 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            APTA
                          </span>
                        ) : (
                          <span className="rounded-full px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-600">
                            SIN LACTANCIA
                          </span>
                        )}
                      </td>
                    </tr>;
                  })}</tbody>
                  <tfoot><tr className="border-t-2 border-slate-100 font-bold"><td colSpan={2} className="p-4">TOTAL DEL DÍA · TODAS LAS VACAS</td><td className="text-center text-emerald-600">{LITROS(manana)}</td><td className="text-center text-amber-600">{LITROS(tarde)}</td><td className="text-center text-navy">{LITROS(manana + tarde)}</td><td /></tr></tfoot>
                </table>
              </div>}
            {!cargando && !fallo && fechaValida && filasFiltradas.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>Mostrando {(paginaActual - 1) * 10 + 1}–{Math.min(paginaActual * 10, filasFiltradas.length)} de {filasFiltradas.length} vacas</span>
              <div className="flex items-center gap-3"><button type="button" onClick={() => setPaginaDiaria(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-navy disabled:opacity-40">Anterior</button><span>Página {paginaActual} de {totalPaginas}</span><button type="button" onClick={() => setPaginaDiaria(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual === totalPaginas} className="rounded-lg border border-slate-200 px-3 py-1.5 text-navy disabled:opacity-40">Siguiente</button></div>
            </div>}
            <RequireRole roles={['propietario', 'administrador', 'peon']}>
              <div className="flex justify-end border-t border-slate-100 p-4"><button type="button" onClick={guardar} disabled={guardando || cargando || fallo || !fechaValida || pendientes.length === 0} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar {pendientes.length} ordeño(s) pendiente(s)</button></div>
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
            {rangoValido && resumenQuery.data && <div className="mt-3 text-xs text-slate-500"><span>Total producido en el período: <strong className="text-navy">{LITROS(Number(resumenQuery.data.litrosProducidos))}</strong></span></div>}
            <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-bold uppercase text-slate-400">Top productoras · {rangoValido ? `${formatearFecha(desde)}–${formatearFecha(hasta)}` : 'sin período'}</h3>{rangoValido && !produccionHistoricaQuery.isLoading && !produccionHistoricaQuery.isError && ranking.map(({ animal, litros }, index) => <div key={animal.id} className="mt-3 flex justify-between gap-2 text-xs"><Link href={`/hato/${animal.id}?tab=produccion`} className="font-semibold text-navy hover:text-sky-700">{index + 1}. #{animal.areteInterno} {animal.nombre}</Link><span>{LITROS(litros)}</span></div>)}</div>
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
            </div>
          </div>
          {rangoValido && !produccionHistoricaQuery.isLoading && !produccionHistoricaQuery.isError && historial.length > 0 ? <>
            <div className="overflow-x-auto"><table aria-label="Historial de producción" className="w-full min-w-[580px] text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Animal</th><th className="p-3 text-left">Turno</th><th className="p-3 text-right">Litros</th></tr></thead><tbody>{historial.slice(0, limiteHistorial).map(({ animal, registro }) => <tr key={registro.id} className="border-t border-slate-100"><td className="p-3">{formatearFecha(registro.fecha)}</td><td className="p-3"><Link className="font-semibold text-navy hover:text-sky-700" href={`/hato/${animal.id}?tab=produccion`}>#{animal.areteInterno} {animal.nombre}</Link></td><td className="p-3">{registro.turno === 'MANANA' ? 'Mañana' : 'Tarde'}</td><td className="p-3 text-right font-semibold">{LITROS(Number(registro.litros))}</td></tr>)}</tbody></table></div>
            {historial.length > limiteHistorial && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => setLimiteHistorial((n) => n + 25)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-navy">Mostrar más ({historial.length - limiteHistorial} restantes)</button></div>}
          </> : <p className="p-8 text-center text-sm text-slate-500">{produccionHistoricaQuery.isLoading ? 'Cargando historial…' : produccionHistoricaQuery.isError ? 'No se pudo cargar el historial.' : 'No hay registros para estos filtros.'}</p>}
        </section>
      </div>

      <ModalCargaMasivaProduccion
        isOpen={isCargaMasivaOpen}
        onClose={() => setIsCargaMasivaOpen(false)}
      />
    </main>
  );
}
