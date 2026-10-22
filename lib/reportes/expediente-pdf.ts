import jsPDF from "jspdf";
import autoTable, { type Table } from "jspdf-autotable";
import type { Animal, Pesaje } from "@/lib/api/animales";
import type { ProduccionLeche } from "@/lib/api/produccion";
import type { EstadoReproductivoResponse } from "@/lib/reproductivo/tipos";
import type { EstadoSanitario, TratamientoSanitario } from "@/lib/api/sanitary";
import {
  ETIQUETA_DISPOSICION,
  ETIQUETA_TURNO,
  getProduccionByAnimal,
} from "@/lib/api/produccion";
import {
  getAnimal,
  getEstadoReproductivo,
  getPesajesByAnimal,
} from "@/lib/api/animales";
import {
  getEstadoSanitario,
  getTratamientosByAnimal,
} from "@/lib/api/sanitary";
import { formatearFecha as formatearFechaCivil, hoyLocal } from "@/lib/reproductivo/fechas";

export interface ExpedientePdfData {
  animal: Animal;
  pesajes?: Pesaje[];
  produccion?: ProduccionLeche[];
  estadoReproductivo?: EstadoReproductivoResponse | null;
  estadoSanitario?: EstadoSanitario | null;
  tratamientos?: TratamientoSanitario[];
  nombreFinca?: string;
}

/**
 * Generador modular del PDF del Expediente Individual del Animal (REPORT-T001 / REPORT-T002 / LEG-T001).
 * Usado tanto en la vista detallada de /hato/:id como en el Centro de Reportes (/reportes).
 */
export function exportarExpedientePdf(data: ExpedientePdfData): void {
  const {
    animal,
    pesajes = [],
    produccion = [],
    estadoReproductivo,
    estadoSanitario,
    tratamientos = [],
    nombreFinca,
  } = data;

  const doc = new jsPDF();
  let yPos = 20;

  // 1. Encabezado principal (LEG-T001: documento técnico de gestión interna)
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Expediente Animal: #${animal.areteInterno} ${animal.nombre || ""}${
      animal.numeroOficialDiio ? ` (DIIO: ${animal.numeroOficialDiio})` : ""
    }`,
    14,
    yPos,
  );
  yPos += 8;

  // 2. Finca y Fecha de emisión con zona horaria de Costa Rica
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const fincaTexto = nombreFinca ? `Finca: ${nombreFinca}` : "Finca Activa";
  const fechaEmision = `Fecha de emisión: ${hoyLocal()} (Costa Rica)`;
  doc.text(`${fincaTexto}  |  ${fechaEmision}`, 14, yPos);
  yPos += 10;

  // 3. Ficha general del animal
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`Raza: ${animal.raza?.nombre || "N/A"}`, 14, yPos);
  doc.text(`Categoría: ${animal.categoria || "N/A"}`, 80, yPos);
  doc.text(`Sexo: ${animal.sexo || "N/A"}`, 150, yPos);
  yPos += 7;

  doc.text(`Peso Actual: ${animal.pesoActualKg || 0} kg`, 14, yPos);
  doc.text(`Potrero: ${animal.potrero?.nombre || "N/A"}`, 80, yPos);
  if (animal.fechaNacimiento) {
    doc.text(`Fecha Nac.: ${formatearFechaCivil(animal.fechaNacimiento)}`, 150, yPos);
  }
  yPos += 7;

  // 4. Estado Sanitario y Reproductivo vigente
  const isMacho = animal.sexo === "Macho";
  const estadoSanitarioTexto = estadoSanitario?.enRetiro
    ? `Retiro Sanitario ACTIVO (Leche: ${estadoSanitario.diasRestantesLeche}d, Carne: ${estadoSanitario.diasRestantesCarne}d)`
    : "Sin retiros sanitarios activos";
  const estadoReproTexto =
    !isMacho && estadoReproductivo?.estadoActual
      ? `Estado Reproductivo: ${estadoReproductivo.estadoActual}`
      : null;

  doc.setFontSize(9);
  if (estadoSanitario?.enRetiro) {
    doc.setTextColor(185, 28, 28);
  } else {
    doc.setTextColor(22, 101, 52);
  }
  doc.text(`Estado Sanitario: ${estadoSanitarioTexto}`, 14, yPos);

  if (estadoReproTexto) {
    doc.setTextColor(71, 85, 105);
    doc.text(estadoReproTexto, 120, yPos);
  }
  yPos += 15;

  const seccionTabla = (titulo: string, head: string[], body: string[][]) => {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(titulo, 14, yPos);
    if (body.length > 0) {
      yPos += 5;
      autoTable(doc, {
        startY: yPos,
        head: [head],
        body,
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] },
      });
      yPos = ((doc as jsPDF & { lastAutoTable: Table }).lastAutoTable.finalY ?? yPos) + 15;
    } else {
      yPos += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Sin registros", 14, yPos);
      yPos += 15;
    }
  };

  // Historial de pesajes
  seccionTabla(
    "Historial de Pesajes",
    ["Fecha", "Peso (kg)"],
    pesajes.map((p) => [
      formatearFechaCivil(p.fecha),
      p.pesoActualKg != null ? `${p.pesoActualKg} kg` : "-",
    ]),
  );

  // Historial de producción de leche (solo hembras)
  if (!isMacho) {
    seccionTabla(
      "Historial de Producción de Leche",
      ["Fecha", "Turno", "Litros", "Disposición"],
      produccion.map((r) => [
        formatearFechaCivil(r.fecha),
        ETIQUETA_TURNO[r.turno],
        `${Number(r.litros).toFixed(1)} L`,
        r.revertido
          ? `${ETIQUETA_DISPOSICION[r.disposicion]} (anulado)`
          : ETIQUETA_DISPOSICION[r.disposicion],
      ]),
    );
  }

  // Historial sanitario
  if (tratamientos && tratamientos.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Historial Sanitario", 14, yPos);
    yPos += 5;

    const tableData = tratamientos.map((t) => [
      t.fecha ? formatearFechaCivil(t.fecha) : "-",
      t.diagnostico || "-",
      t.farmaco || "-",
      t.dosis || "-",
      t.veterinario || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Fecha", "Enfermedad", "Medicamento", "Dosis", "Responsable"]],
      body: tableData,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    yPos = ((doc as jsPDF & { lastAutoTable: Table }).lastAutoTable.finalY ?? yPos) + 15;
  } else {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Historial Sanitario", 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Sin registros", 14, yPos);
    yPos += 15;
  }

  // Historial reproductivo (solo si aplica)
  const serviciosActivos = estadoReproductivo?.servicioActivo
    ? [estadoReproductivo.servicioActivo]
    : [];
  if (serviciosActivos.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Historial Reproductivo", 14, yPos);
    yPos += 5;

    const tableData = serviciosActivos.map((s) => [
      s.fechaServicio ? formatearFechaCivil(s.fechaServicio) : "-",
      s.tipoServicio || "-",
      s.toroOPajilla || "-",
      estadoReproductivo?.ultimoDiagnostico?.resultado || "Pendiente",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Fecha", "Tipo", "Toro/Semen", "Estado"]],
      body: tableData,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    yPos = ((doc as jsPDF & { lastAutoTable: Table }).lastAutoTable.finalY ?? yPos) + 15;
  } else {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Historial Reproductivo", 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Sin registros", 14, yPos);
    yPos += 15;
  }

  // Pie de página legal obligatorio (LEG-T001 / REPORT-T001)
  if (yPos > 260) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 5;
  }
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Documento técnico para control y gestión interna de la finca. No constituye certificación oficial estatal (DIIO/SENASA) ni asesoría médico-veterinaria.",
    14,
    yPos,
  );
  doc.text(
    `Identificación de manejo interno: #${animal.areteInterno}  |  Plataforma ResDigital`,
    14,
    yPos + 4,
  );

  // Descarga del archivo
  doc.save(`Expediente_${animal.areteInterno}_${hoyLocal()}.pdf`);
}

/**
 * Consulta en paralelo todos los datos reales del animal por ID y descarga directamente
 * el expediente en PDF sin requerir que el usuario navegue a otra página.
 */
export async function descargarExpedientePdfPorId(
  animalId: string,
  nombreFinca?: string,
): Promise<void> {
  const animal = await getAnimal(animalId);
  const isHembra = animal.sexo === "Hembra";

  const [pesajes, produccion, estadoReproductivo, tratamientos, estadoSanitario] =
    await Promise.all([
      getPesajesByAnimal(animalId).catch(() => []),
      isHembra ? getProduccionByAnimal(animalId).catch(() => []) : Promise.resolve([]),
      isHembra ? getEstadoReproductivo(animalId).catch(() => null) : Promise.resolve(null),
      getTratamientosByAnimal(animalId).catch(() => []),
      getEstadoSanitario(animalId).catch(() => null),
    ]);

  exportarExpedientePdf({
    animal,
    pesajes,
    produccion,
    estadoReproductivo,
    estadoSanitario,
    tratamientos,
    nombreFinca,
  });
}
