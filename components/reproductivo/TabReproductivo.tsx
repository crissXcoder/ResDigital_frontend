'use client';

import { useState } from 'react';
import EstadoReproductivoPanel from './EstadoReproductivoPanel';
import HistorialReproductivo from './HistorialReproductivo';
import ServicioForm from './forms/ServicioForm';
import DiagnosticoForm from './forms/DiagnosticoForm';
import PartoForm from './forms/PartoForm';
import SecadoForm from './forms/SecadoForm';
import { useEstadoReproductivo, useHistorialReproductivo } from '@/lib/hooks/use-reproductivo';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import type { EventoHistorial, DetalleParto } from '@/lib/reproductivo/tipos';
import { puedeQuedarPreniada } from '@/lib/reproductivo/edad-preniez';

/**
 * Contenedor de la pestaña "Ciclo Reproductivo" del Expediente 360°.
 * Montado por Danny en hato/[id]/page.tsx con `{ animalId, sexo }`.
 *
 * No agrega ruta nueva, así que el patrón Server delgado + Client aparte
 * (usado en /login para el bug de CSP) no aplica acá — esa regla es para
 * páginas nuevas bajo rutas protegidas.
 */
interface TabReproductivoProps {
  animalId: string;
  sexo: string;
}

type ModalActivo = 'servicio' | 'diagnostico' | 'parto' | 'secado' | null;

export default function TabReproductivo({ animalId, sexo }: TabReproductivoProps) {
  const [modalActivo, setModalActivo] = useState<ModalActivo>(null);
  const [partoACorregir, setPartoACorregir] = useState<(EventoHistorial & { detalle: DetalleParto }) | undefined>();
  const { role } = useAuthUser();

  const habilitado = sexo !== 'Macho';

  const {
    data: estado,
    isLoading: cargandoEstado,
    isError: errorEstado,
  } = useEstadoReproductivo(animalId, habilitado);

  const { data: historial, isLoading: cargandoHistorial } = useHistorialReproductivo(
    animalId,
    habilitado,
  );

  // Defensa en profundidad: la lista de pestañas de Danny ya excluye esta
  // pestaña para machos (page.tsx:358-366).
  if (!habilitado) return null;

  if (cargandoEstado || cargandoHistorial) {
    return (
      <div className="mt-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 animate-pulse h-40" />
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 animate-pulse h-60" />
      </div>
    );
  }

  if (errorEstado || !estado) {
    return (
      <div className="mt-6 bg-danger-bg text-danger border border-danger/30 rounded-xl p-6 text-sm">
        No se pudo cargar el estado reproductivo de este animal.
      </div>
    );
  }

  const aptaParaPreniez = puedeQuedarPreniada(estado);
  const rolesServicio = ['propietario', 'administrador', 'peon', 'veterinario'].includes(role ?? '');
  const rolesDiagnostico = ['propietario', 'administrador', 'veterinario'].includes(role ?? '');

  return (
    <div className="mt-6 space-y-6">
      <EstadoReproductivoPanel
        estado={estado}
        puedeRegistrarServicio={rolesServicio && aptaParaPreniez}
        puedeRegistrarDiagnostico={rolesDiagnostico && aptaParaPreniez}
        puedeRegistrarSecado={['propietario', 'administrador', 'peon', 'veterinario'].includes(role ?? '')}
        puedeRegistrarParto={['propietario', 'administrador', 'peon', 'veterinario'].includes(role ?? '')}
        onRegistrarServicio={() => setModalActivo('servicio')}
        onRegistrarDiagnostico={() => setModalActivo('diagnostico')}
        onRegistrarSecado={() => setModalActivo('secado')}
        onRegistrarParto={() => setModalActivo('parto')}
      />

      <HistorialReproductivo eventos={historial ?? []} onCorregirParto={['propietario', 'administrador', 'peon', 'veterinario'].includes(role ?? '') ? (evento) => { setPartoACorregir(evento); setModalActivo('parto'); } : undefined} />

      {modalActivo === 'servicio' && (
        <ServicioForm animalId={animalId} onClose={() => setModalActivo(null)} />
      )}
      {modalActivo === 'diagnostico' && (
        <DiagnosticoForm
          animalId={animalId}
          eventoServicioId={estado.servicioActivo?.eventoId ?? ''}
          fechaServicio={estado.servicioActivo?.fechaServicio}
          onClose={() => setModalActivo(null)}
        />
      )}
      {modalActivo === 'parto' && (
        <PartoForm
          animalId={animalId}
          correccion={partoACorregir}
          eventoServicioId={estado.servicioActivo?.eventoId}
          fechaServicio={estado.servicioActivo?.fechaServicio}
          diasGestacionRaza={estado.diasGestacionRaza}
          onClose={() => { setModalActivo(null); setPartoACorregir(undefined); }}
        />
      )}
      {modalActivo === 'secado' && (
        <SecadoForm animalId={animalId} onClose={() => setModalActivo(null)} />
      )}
    </div>
  );
}
