import jsPDF from "jspdf";
import autoTable, { type Table } from "jspdf-autotable";
import { formatearFecha, hoyLocal, textoDiasRestantes } from "@/lib/reproductivo/fechas";
import type { ProximoEvento } from "@/lib/api/reproductivo";
import type { TipoEventoFeed } from "@/lib/reproductivo/tipos";

/**
 * Genera el documento PDF de Programación reproductiva y partos proyectados (REPORT-T001 / REPORT-T002).
 */
export function exportarReproductivoPdf(params: {
  eventos: ProximoEvento[];
  diasVentana: number;
  filtro: TipoEventoFeed | 'Todos';
  nombreFinca?: string;
}) {
  const { eventos, diasVentana, filtro, nombreFinca } = params;
  if (!eventos || eventos.length === 0) return;

  const doc = new jsPDF();
  let yPos = 20;

  // Encabezado
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('Programación reproductiva y partos proyectados', 14, yPos);
  yPos += 8;

  // Finca y Fecha de Emisión
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const fincaNombre = nombreFinca ? `Finca: ${nombreFinca}` : 'Finca activa';
  const fechaEmision = `Fecha de emisión: ${hoyLocal()} (Costa Rica)`;
  doc.text(`${fincaNombre}  |  ${fechaEmision}`, 14, yPos);
  yPos += 6;

  // Parámetros del Reporte
  doc.text(`Horizonte: Próximos ${diasVentana} días  |  Filtro aplicado: ${filtro}`, 14, yPos);
  yPos += 10;

  const eventosFiltrados = filtro === 'Todos' ? eventos : eventos.filter((e) => e.tipo === filtro);
  const urgentes = eventosFiltrados.filter((e) => e.urgente).length;
  const vencidos = eventosFiltrados.filter((e) => e.diasRestantes < 0).length;

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

  doc.save(`Programacion_Reproductiva_${diasVentana}d_${hoyLocal()}.pdf`);
}
