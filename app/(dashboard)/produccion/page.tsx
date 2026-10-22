'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Milk, ArrowRight, Loader2 } from 'lucide-react';
import { getAnimales, type Animal } from '@/lib/api/animales';

export default function ProduccionPage() {
  const { data: animales = [], isLoading, isError } = useQuery({
    queryKey: ['animales', 'produccion'],
    queryFn: () => getAnimales(),
  });

  const hembrasActivas = animales.filter((animal) => animal.activo && animal.sexo !== 'Macho');

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Milk size={28} /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-navy">Producción Lechera</h1>
              <p className="mt-1 text-sm text-slate-500">Selecciona una hembra activa para registrar ordeños, revisar lactancia e historial.</p>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-12 text-slate-500"><Loader2 className="animate-spin" size={18} /> Cargando animales...</div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">No se pudieron cargar las hembras activas.</div>
        ) : hembrasActivas.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-500">No hay hembras activas disponibles para producción.</div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hembrasActivas.map((animal: Animal) => (
              <Link key={animal.id} href={`/hato/${animal.id}?tab=produccion`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
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
          </section>
        )}
      </div>
    </main>
  );
}
