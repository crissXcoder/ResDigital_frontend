'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { getDescendenciaAnimal } from '@/lib/api/animales';
import { formatearFecha as formatearFechaCivil } from '@/lib/reproductivo/fechas';

export default function DescendenciaRegistrada({ animalId }: { animalId: string }) {
  const descendenciaQuery = useQuery({
    queryKey: ['descendenciaAnimal', animalId],
    queryFn: () => getDescendenciaAnimal(animalId),
  });

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-lg font-bold text-navy">Descendencia Registrada</h3>
        <span className="w-6 h-6 rounded bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
          {descendenciaQuery.isPending ? '…' : descendenciaQuery.isError ? '!' : descendenciaQuery.data.length}
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-8">Crías registradas en el sistema donde este animal figura como padre o madre.</p>

      {descendenciaQuery.isPending ? (
        <p role="status" className="py-8 text-center text-sm text-slate-500">Cargando descendencia…</p>
      ) : descendenciaQuery.isError ? (
        <p role="alert" className="py-8 text-center text-sm text-red-700">No se pudo cargar la descendencia. Vuelva a intentarlo más tarde.</p>
      ) : descendenciaQuery.data.length ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {descendenciaQuery.data.map((cria) => (
            <li key={cria.id}>
              <Link href={`/hato/${cria.id}`} className="block rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <span className="font-semibold text-navy">#{cria.areteInterno}{cria.nombre ? ` ${cria.nombre}` : ''}</span>
                <span className="block mt-1 text-xs text-slate-500">
                  {cria.categoria} · {cria.sexo}{cria.fechaNacimiento ? ` · Nacimiento: ${formatearFechaCivil(cria.fechaNacimiento)}` : ''}
                </span>
                <span className={`inline-block mt-2 text-xs font-semibold ${cria.activo ? 'text-green-700' : 'text-slate-500'}`}>
                  {cria.activo ? 'Activa en el hato' : 'Registro histórico'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-300 mb-4">
            <Plus className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-500">No se registran crías para este animal.</p>
        </div>
      )}
    </section>
  );
}
