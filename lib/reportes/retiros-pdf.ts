import jsPDF from "jspdf";
import autoTable, { type Table } from "jspdf-autotable";
import { hoyLocal } from "@/lib/reproductivo/fechas";
import type { AnimalEnRetiro } from "@/lib/types/dashboard";

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function tipoRetiro(animal: AnimalEnRetiro): "Ambos" | "Leche" | "Carne" {
  if (animal.diasRestantesLeche !== null && animal.diasRestantesCarne !== null) return "Ambos";
  if (animal.diasRestantesLeche !== null) return "Leche";
  return "Carne";
}

function diasRestantesMayor(animal: AnimalEnRetiro): number {
  const l = animal.diasRestantesLeche ?? -Infinity;
  const c = animal.diasRestantesCarne ?? -Infinity;
  return Math.max(l, c);
}

/**
 * Genera el documento PDF del Reporte ejecutivo de retiros sanitarios activos (REPORT-T001 / REPORT-T002).
 * Respeta todas las reglas de la bóveda:
 * - Fecha local civil de Costa Rica
 * - Nombre de finca del usuario autenticado
 * - Formato técnico (sin llamarlo "oficial")
 * - Descargo legal obligatorio (LEG-T001)
 */
export function exportarRetirosPdf(data: AnimalEnRetiro[], nombreFinca?: string) {
  const doc = new jsPDF();
  let yPos = 20;

  // Encabezado
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('Reporte ejecutivo de retiros sanitarios activos', 14, yPos);
  yPos += 8;

  // Finca y Fecha de Emisión (Auditoría de vigencia)
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const fincaNombre = nombreFinca ? `Finca: ${nombreFinca}` : 'Finca activa';
  const fechaEmision = `Fecha de emisión: ${hoyLocal()} (Costa Rica)`;
  doc.text(`${fincaNombre}  |  ${fechaEmision}`, 14, yPos);
  yPos += 12;

  const lista = data ?? [];

  if (lista.length === 0) {
    // Criterio 2: Constancia explícita de cero animales en retiro
    doc.setFontSize(13);
    doc.setTextColor(22, 101, 52); // verde
    doc.text('Constancia Técnica: Cero (0) Animales en Retiro Sanitario', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Al momento de emisión de este reporte, no se registran animales bajo período de restricción',
      14,
      yPos
    );
    yPos += 6;
    doc.text(
      'por aplicación de medicamentos veterinarios en la finca. La producción de leche y los animales',
      14,
      yPos
    );
    yPos += 6;
    doc.text(
      'para comercialización se encuentran libres de restricciones sanitarias activas.',
      14,
      yPos
    );
    yPos += 15;
  } else {
    // Criterio 1: Resumen ejecutivo categorizado
    const enLeche = lista.filter((a) => a.diasRestantesLeche !== null && (a.diasRestantesLeche ?? 0) > 0).length;
    const enCarne = lista.filter((a) => a.diasRestantesCarne !== null && (a.diasRestantesCarne ?? 0) > 0).length;

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Total bajo retiro: ${lista.length}   |   Bloqueo en leche (ordeño): ${enLeche}   |   Bloqueo en carne (venta): ${enCarne}`,
      14,
      yPos
    );
    yPos += 8;

    // Criterio 4: Tabla con formato ejecutivo y semáforo
    const tableData = lista.map((a) => {
      const tipo = tipoRetiro(a);
      const dias = diasRestantesMayor(a);
      const estadoTexto = dias <= 2 ? 'Crítico (<=2d)' : 'En Retiro Activo';
      return [
        a.nombre ? `${a.nombre} (#${a.arete})` : `#${a.arete}`,
        tipo,
        a.fechaLiberacionLeche ? formatFecha(a.fechaLiberacionLeche) : 'N/A',
        a.fechaLiberacionCarne ? formatFecha(a.fechaLiberacionCarne) : 'N/A',
        dias > 0 ? `${dias} días` : '0 días',
        estadoTexto,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Animal', 'Restricción', 'Liberación Leche', 'Liberación Carne', 'Días Bloqueo', 'Estado']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    yPos = ((doc as jsPDF & { lastAutoTable: Table }).lastAutoTable?.finalY ?? yPos) + 15;
  }

  // Pie de página legal obligatorio (LEG-T001 / REPORT-T001)
  const finalY = yPos > 260 ? 20 : yPos;
  if (yPos > 260) {
    doc.addPage();
  }

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Documento técnico para control y gestión interna de la finca. No constituye certificación oficial estatal ni sustituye las autorizaciones de SENASA.',
    14,
    finalY
  );
  doc.text(
    'ResDigital — Sistema de Gestión Ganadera Multi-Tenant',
    14,
    finalY + 4
  );

  doc.save(`Reporte_Retiros_Sanitarios_${hoyLocal()}.pdf`);
}
