'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Milk, ArrowRight, Loader2, CalendarDays, Save } from 'lucide-react';
import { getAnimales, type Animal } from '@/lib/api/animales';

export default function ProduccionPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [valores, setValores] = useState<Record<string, { manana: string; tarde: string }>>({});
  const { data: animales = [], isLoading, isError } = useQuery({
    queryKey: ['animales', 'produccion'],
    queryFn: () => getAnimales(),
  });

  const hembrasActivas = animales.filter((animal) => animal.activo && animal.sexo !== 'Macho');

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Milk size={28} /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy">Producción Lechera</h1>
              <p className="mt-1 text-sm text-slate-500">Registro diario de litros por vaca. Solo hembras activas.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['PRODUCCIÓN TOTAL HOY', 'ORDEÑO MAÑANA', 'ORDEÑO TARDE', 'VACAS BLOQUEADAS'].map((label, index) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold tracking-wide text-slate-500">{label}</p><p className={`mt-1 text-2xl font-extrabold ${index === 3 ? 'text-red-600' : index === 2 ? 'text-amber-600' : index === 1 ? 'text-emerald-600' : 'text-navy'}`}>0.0 L</p><p className="text-xs text-slate-400">{index === 3 ? 'En retiro sanitario' : index === 0 ? 'Mañana + Tarde' : `Turno ${index === 1 ? 'AM' : 'PM'}`}</p></div>
          ))}
        </section>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_255px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold text-navy">Registro Diario</h2><p className="text-xs text-slate-500">Ingrese los litros por vaca para la fecha seleccionada</p></div><label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><CalendarDays size={16} /><input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} /></label></div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-12 text-slate-500"><Loader2 className="animate-spin" size={18} /> Cargando animales...</div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">No se pudieron cargar las hembras activas.</div>
        ) : hembrasActivas.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-500">No hay hembras activas disponibles para producción.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {hembrasActivas.map((animal: Animal) => (
              <div key={animal.id} className="group grid grid-cols-[1.1fr_1fr_1fr_auto_auto] items-center gap-3 p-3 transition hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Arete #{animal.areteInterno}</p>
                    <Link href={`/hato/${animal.id}?tab=produccion`} className="mt-1 block text-lg font-bold text-navy hover:text-sky-700">#{animal.areteInterno}</Link><span className="text-xs text-slate-500">{animal.nombre || 'Sin nombre'}</span>
                    <p className="text-sm text-slate-500">{animal.categoria}{animal.potrero ? ` · ${animal.potrero.nombre}` : ''}</p>
                  </div>
                  <input className="w-full rounded-md border border-slate-200 p-2 text-center text-sm" type="number" min="0" step="0.1" placeholder="0.0" aria-label={`Mañana ${animal.areteInterno}`} value={valores[animal.id]?.manana ?? ''} onChange={(e) => setValores((p) => ({ ...p, [animal.id]: { manana: e.target.value, tarde: p[animal.id]?.tarde ?? '' } }))} /><input className="w-full rounded-md border border-slate-200 p-2 text-center text-sm" type="number" min="0" step="0.1" placeholder="0.0" aria-label={`Tarde ${animal.areteInterno}`} value={valores[animal.id]?.tarde ?? ''} onChange={(e) => setValores((p) => ({ ...p, [animal.id]: { manana: p[animal.id]?.manana ?? '', tarde: e.target.value } }))} /><span className="font-bold">—</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-center text-[10px] font-bold text-emerald-700">APTO</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end border-t border-slate-100 p-4"><button type="button" className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><Save size={16} /> Guardar pesaje lechero del día</button></div>
        </div><aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-bold text-navy">Producción General (L/día)</h3><div className="mt-5 flex h-44 items-end gap-2 border-b border-slate-200 px-2">{[18, 38, 42, 17, 80, 95].map((height, i) => <div key={i} className="flex-1 rounded-t bg-navy" style={{ height: `${height}%` }} />)}</div><h4 className="mt-5 text-xs font-bold uppercase text-slate-500">Top productoras</h4>{hembrasActivas.slice(0, 4).map((a, i) => <div key={a.id} className="mt-2 flex items-center justify-between text-xs"><span>{i + 1}　#{a.areteInterno} {a.nombre}</span><strong>0.0L</strong></div>)}</aside></section>
      </div>
    </main>
  );
}
