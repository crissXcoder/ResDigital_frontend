'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Milk, ArrowRight, Loader2, CalendarDays, Save } from 'lucide-react';
import { getAnimales, type Animal } from '@/lib/api/animales';

export default function ProduccionPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
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
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
              <Link key={animal.id} href={`/hato/${animal.id}?tab=produccion`} className="group flex items-center justify-between gap-3 p-5 transition hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Arete #{animal.areteInterno}</p>
                    <h2 className="mt-1 text-lg font-bold text-navy">{animal.nombre || 'Sin nombre'}</h2>
                    <p className="text-sm text-slate-500">{animal.categoria}{animal.potrero ? ` · ${animal.potrero.nombre}` : ''}</p>
                  </div>
                  <ArrowRight className="text-slate-300 transition group-hover:text-blue-600" size={20} />
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="flex justify-end border-t border-slate-100 p-4"><button type="button" className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><Save size={16} /> Guardar pesaje lechero del día</button></div>
        </section>
      </div>
    </main>
  );
}
