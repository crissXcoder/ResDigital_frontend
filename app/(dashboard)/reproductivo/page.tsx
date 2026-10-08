'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable, { type Table } from 'jspdf-autotable';
import { useProximosEventosFinca } from '@/lib/hooks/use-reproductivo';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { ChipHito } from '@/components/reproductivo/EstadoChip';
import { formatearFecha, hoyLocal, textoDiasRestantes } from '@/lib/reproductivo/fechas';
import type { TipoEventoFeed } from '@/lib/reproductivo/tipos';

/**
 * Calendario reproductivo de toda la finca. GET /reproductivo/proximos-eventos,
 * consumido por useProximosEventosFinca (lib/hooks/use-reproductivo.ts), que
 * comparte clave con el feed del dashboard: registrar un evento desde acá o
 * desde la ficha del animal actualiza ambas pantallas solo.
 *
 * "Aviso Parto FPP" en el feed de finca viene publicado como 'Parto'
 * (ver lib/reproductivo/tipos.ts, TipoEventoFeed) — distinto de 'Parto FPP'
 * que usa el hito de un solo animal.
 */
const DIAS_VENTANA_DEFAULT = 60;

const FILTROS: { label: string; tipo: TipoEventoFeed | 'Todos' }[] = [
  { label: 'Todos', tipo: 'Todos' },
  { label: 'Palpación', tipo: 'Palpación' },
  { label: 'Secado', tipo: 'Secado' },
  { label: 'Aviso Parto', tipo: 'Aviso Parto' },
  { label: 'Aviso Parto Urgente', tipo: 'Aviso Parto Urgente' },
  { label: 'Parto', tipo: 'Parto' },
];

export default function ReproductivoPage() {
  const [diasVentana, setDiasVentana] = useState(DIAS_VENTANA_DEFAULT);
  const [filtro, setFiltro] = useState<TipoEventoFeed | 'Todos'>('Todos');
  const { user } = useAuthUser();

  const { data: eventos, isLoading, isError } = useProximosEventosFinca(diasVentana);

  const eventosFiltrados = useMemo(() => {
    const lista = eventos ?? [];
    const filtrados = filtro === 'Todos' ? lista : lista.filter((e) => e.tipo === filtro);
    return [...filtrados].sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [eventos, filtro]);

  const urgentes = (eventos ?? []).filter((e) => e.urgente).length;
  const vencidos = (eventos ?? []).filter((e) => e.diasRestantes < 0).length;

  const handleDownloadPDF = () => {
    if (!eventos || eventos.length === 0) return;

    const doc = new jsPDF();
    let yPos = 20;

    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('Programación Reproductiva y Partos Proyectados', 14, yPos);
    yPos += 8;

    // Finca y Fecha de Emisión
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const fincaNombre = user?.nombreFinca ? `Finca: ${user.nombreFinca}` : 'Finca Activa';
    const fechaEmision = `Fecha de emisión: ${hoyLocal()} (Costa Rica)`;
    doc.text(`${fincaNombre}  |  ${fechaEmision}`, 14, yPos);
    yPos += 6;

    // Parámetros del Reporte
    doc.text(`Horizonte: Próximos ${diasVentana} días  |  Filtro aplicado: ${filtro}`, 14, yPos);
    yPos += 10;

    // Resumen Ejecutivo
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Total hitos en ventana: ${eventosFiltrados.length}   |   Avisos urgentes (FPP-3): ${urgentes}   |   Vencidos pendientes: ${vencidos}`,
      14,
      yPos
    );
    yPos += 8;

    // Tabla de Hitos y Partos Proyectados
    const tableData = eventosFiltrados.map((e) => [
      e.nombre ? `${e.nombre} (#${e.arete})` : `#${e.arete}`,
      e.tipo === 'Parto' ? 'Parto FPP' : e.tipo,
      formatearFecha(e.fecha),
      textoDiasRestantes(e.diasRestantes),
      e.urgente ? 'Urgente (FPP-3)' : e.diasRestantes < 0 ? 'Vencido' : 'Programado',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Animal', 'Hito Reproductivo', 'Fecha Estimada', 'Días Restantes', 'Prioridad']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    const finalY = ((doc as jsPDF & { lastAutoTable: Table }).lastAutoTable?.finalY ?? yPos) + 15;
    const footerY = finalY > 260 ? 20 : finalY;
    if (finalY > 260) {
      doc.addPage();
    }

    // Pie de página legal (LEG-T001 / REPORT-T001)
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Documento técnico para control y gestión interna de la finca. No constituye certificación oficial estatal ni asesoría médico-veterinaria.',
      14,
      footerY
    );
    doc.text(
      `Generado por ResDigital  |  Horizonte de proyección: ${diasVentana} días`,
      14,
      footerY + 4
    );

    // Descarga directa
    doc.save(`Programacion_Reproductiva_${diasVentana}d_${hoyLocal()}.pdf`);
  };

  return (
    <main className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-navy">Reproducción</h1>
            <p className="text-sm text-slate-500 mt-1">
              Calendario reproductivo de toda la finca — palpaciones, secados y avisos de parto próximos.
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={isLoading || !eventos || eventos.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy-light transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            Descargar Reporte PDF
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Hitos en ventana
            </p>
            <p className="text-3xl font-extrabold text-navy">{eventos?.length ?? 0}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Avisos urgentes (FPP-3)
            </p>
            <p className="text-3xl font-extrabold text-danger">{urgentes}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Vencidos (últimos 7 días)
            </p>
            <p className="text-3xl font-extrabold text-warning">{vencidos}</p>
          </div>
        </div>

        {/* Filtros por tipo */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTROS.map((f) => (
              <button
                key={f.label}
                onClick={() => setFiltro(f.tipo)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                  filtro === f.tipo
                    ? 'bg-navy text-white border-transparent'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            Ventana:
            <select
              value={diasVentana}
              onChange={(e) => setDiasVentana(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-light"
            >
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
              <option value={180}>180 días</option>
            </select>
          </label>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Animal
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Hito
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Restante
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 font-medium">
                      Cargando calendario reproductivo...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <span className="inline-flex items-center gap-2 text-danger text-sm font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        No se pudo cargar el calendario reproductivo.
                      </span>
                    </td>
                  </tr>
                ) : eventosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 font-medium">
                      <span className="inline-flex flex-col items-center gap-2">
                        <CalendarClock className="w-8 h-8 text-slate-300" />
                        No hay hitos reproductivos en esta ventana.
                      </span>
                    </td>
                  </tr>
                ) : (
                  eventosFiltrados.map((evento) => (
                    <tr
                      key={`${evento.animalId}-${evento.tipo}-${evento.fecha}`}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        evento.urgente ? 'bg-danger-bg/40' : ''
                      }`}
                    >
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-navy text-sm">{evento.nombre}</span>
                        <span className="text-slate-400 font-mono text-xs ml-2">
                          ({evento.arete})
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-2">
                          {evento.urgente && <AlertTriangle className="w-4 h-4 text-danger" />}
                          <ChipHito tipo={evento.tipo === 'Parto' ? 'Parto FPP' : evento.tipo} />
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-700">
                        {formatearFecha(evento.fecha)}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <span
                          className={
                            evento.diasRestantes < 0
                              ? 'text-warning font-semibold'
                              : 'text-slate-600'
                          }
                        >
                          {textoDiasRestantes(evento.diasRestantes)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/hato/${evento.animalId}`}
                          className="px-4 py-2 bg-navy text-white text-xs font-bold rounded-lg hover:bg-navy-light transition-colors shadow-sm"
                        >
                          Ver ficha
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
