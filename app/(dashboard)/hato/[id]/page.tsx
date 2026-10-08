'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable, { type Table } from 'jspdf-autotable';
import type { UpdateAnimalInput, Pesaje, DocumentoAnimal } from '@/lib/api/animales';
import type { TratamientoSanitario } from '@/lib/api/sanitary';
import type { PesajeFormData } from '@/components/modals/ModalPesaje';
import type { ServicioFormData } from '@/components/modals/ModalServicio';
import type { DiagnosticoFormData } from '@/components/modals/ModalDiagnostico';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAnimal,
  createPesaje,
  getPesajesByAnimal,
  updateAnimal,
  getDocumentos,
  createDocumento,
  getEstadoReproductivo,
  createServicioReproductivo,
  createDiagnosticoReproductivo,
} from '@/lib/api/animales';
import {
  anularTratamiento,
  corregirTratamiento,
  createTratamiento,
  diasRestantesRetiro,
  formatearFecha,
  getEstadoSanitario,
  getTratamientosByAnimal,
  toCreateTratamientoPayload,
  toDatosTratamientoPayload,
} from '@/lib/api/sanitary';
import { createClient } from '@/lib/supabase/client';
import { BUCKET_ANIMAL_DOCS } from '@/lib/supabase/buckets';
import { isDefinitiveApiRejection } from '@/lib/api/client';
import {
  ChevronLeft,
  Plus,
  Download,
  Activity,
  Baby,
  Droplet,
  AlertTriangle,
  Pencil,
  CheckCircle2,
  Loader2,
  FileText,
  Camera,
  QrCode,
} from 'lucide-react';
import ModalPesaje from '@/components/modals/ModalPesaje';
import ModalServicio from '@/components/modals/ModalServicio';
import ModalDiagnostico from '@/components/modals/ModalDiagnostico';
import ModalTratamiento from '@/components/modals/ModalTratamiento';
import { AccionesTratamiento } from '@/components/sanitario/AccionesTratamiento';
import { BadgesRetiro } from '@/components/sanitario/BadgesRetiro';
import { DocumentoTratamientoLink } from '@/components/sanitario/DocumentoTratamientoLink';
import ModalEditarOrigen from '@/components/modals/ModalEditarOrigen';
import ModalDocumento from '@/components/modals/ModalDocumento';
import ModalQrAnimal from '@/components/modals/ModalQrAnimal';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { formatearFecha as formatearFechaCivil, hoyLocal } from '@/lib/reproductivo/fechas';
import { RequireRole } from '@/components/auth/RequireRole';
import TabProduccion from '@/components/produccion/TabProduccion';
import {
  ETIQUETA_DISPOSICION,
  ETIQUETA_TURNO,
  getProduccionByAnimal,
  toCreatePesajePayload,
} from '@/lib/api/produccion';
function DocumentLink({ objectPath, children, ...props }: React.ComponentProps<'a'> & { objectPath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    createClient().storage.from(BUCKET_ANIMAL_DOCS).createSignedUrl(objectPath, 60 * 10)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setFailed(true);
        else setUrl(data.signedUrl);
      }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [objectPath]);

  if (failed) return <span className="text-xs text-slate-500">No se pudo cargar el documento.</span>;
  if (!url) return <span className="text-xs text-slate-500">Preparando documento…</span>;
  return <a href={url} {...props}>{children}</a>;
}
import { ModalEditarAnimal } from '@/components/modals/ModalEditarAnimal';
import { ModalDarBaja } from '@/components/modals/ModalDarBaja';
import TabReproductivo from '@/components/reproductivo/TabReproductivo';
import LineaTiempoGestacion from '@/components/reproductivo/LineaTiempoGestacion';

export default function ExpedienteAnimal() {
  const params = useParams();
  const animalId = params.id as string;

  const [activeTab, setActiveTab] = useState('resumen');

  // Modals state
  const [isPesajeOpen, setIsPesajeOpen] = useState(false);
  const [isServicioOpen, setIsServicioOpen] = useState(false);
  const [isDiagnosticoOpen, setIsDiagnosticoOpen] = useState(false);
  const [diagnosticoServicioId, setDiagnosticoServicioId] = useState('');
  const [isTratamientoOpen, setIsTratamientoOpen] = useState(false);
  const [tratamientoSeleccionado, setTratamientoSeleccionado] = useState<TratamientoSanitario | null>(null);
  const [isOrigenOpen, setIsOrigenOpen] = useState(false);
  const [isDocumentoOpen, setIsDocumentoOpen] = useState(false);
  const [isEditarAnimalOpen, setIsEditarAnimalOpen] = useState(false);
  const [isBajaOpen, setIsBajaOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const { user: authUser } = useAuthUser();

  // Documentos state
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const supabase = createClient();

  const queryClient = useQueryClient();

  const { data: animal, isLoading, isError } = useQuery({
    queryKey: ['animal', animalId],
    queryFn: () => getAnimal(animalId),
  });

  const { data: pesajes } = useQuery({
    queryKey: ['pesajes', animalId],
    queryFn: () => getPesajesByAnimal(animalId),
  });

  const { data: produccion } = useQuery({
    queryKey: ['produccionLeche', animalId],
    queryFn: () => getProduccionByAnimal(animalId),
    enabled: !!animal && animal.sexo !== 'Macho',
  });

  const { data: estadoReproductivo } = useQuery({
    queryKey: ['estadoReproductivo', animalId],
    queryFn: () => getEstadoReproductivo(animalId),
  });

  const { data: tratamientos } = useQuery({
    queryKey: ['tratamientos', animalId],
    queryFn: () => getTratamientosByAnimal(animalId),
  });

  const { data: estadoSanitario } = useQuery({
    queryKey: ['estadoSanitario', animalId],
    queryFn: () => getEstadoSanitario(animalId),
  });

  const { data: documentosDocumentos } = useQuery({
    queryKey: ['documentos', animalId],
    queryFn: () => getDocumentos(animalId),
  });

  const pesajeMutation = useMutation({
    mutationFn: (data: PesajeFormData) =>
      createPesaje(toCreatePesajePayload({ animalId, fecha: data.fecha, pesoActualKg: data.peso_actual })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesajes', animalId] });
      queryClient.invalidateQueries({ queryKey: ['animal', animalId] });
    }
  });

  const servicioMutation = useMutation({
    mutationFn: (data: ServicioFormData) => createServicioReproductivo(animalId, {
      fechaEvento: data.fecha,
      tipoServicio: data.tipo_servicio,
      toroOPajilla: data.semental,
      responsable: data.inseminador,
      notas: data.observaciones ? `Potrero: ${data.potrero || 'N/A'} - ${data.observaciones}` : (data.potrero ? `Potrero: ${data.potrero}` : '')
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estadoReproductivo', animalId] });
      setIsServicioOpen(false);
    }
  });

  const diagnosticoMutation = useMutation({
    mutationFn: (data: DiagnosticoFormData) => createDiagnosticoReproductivo(animalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estadoReproductivo', animalId] });
      setIsDiagnosticoOpen(false);
    }
  });

  const invalidarSanitario = () => {
    queryClient.invalidateQueries({ queryKey: ['tratamientos', animalId] });
    queryClient.invalidateQueries({ queryKey: ['estadoSanitario', animalId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'animales-en-retiro'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'kpis'] });
  };

  const tratamientoMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createTratamiento(toCreateTratamientoPayload(data, animalId)),
    onSuccess: () => {
      invalidarSanitario();
      setIsTratamientoOpen(false);
      setTratamientoSeleccionado(null);
    }
  });

  const corregirTratamientoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      corregirTratamiento(id, toDatosTratamientoPayload(data)),
    onSuccess: () => {
      invalidarSanitario();
      setIsTratamientoOpen(false);
      setTratamientoSeleccionado(null);
    }
  });

  const [tratamientoAAnular, setTratamientoAAnular] = useState<TratamientoSanitario | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const anularTratamientoMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => anularTratamiento(id, motivo),
    onSuccess: () => {
      invalidarSanitario();
      setTratamientoAAnular(null);
      setMotivoAnulacion('');
    }
  });

  const updateAnimalMutation = useMutation({
    mutationFn: (data: UpdateAnimalInput) => updateAnimal(animalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal', animalId] });
      setIsOrigenOpen(false);
    }
  });

  const documentoMutation = useMutation({
    mutationFn: (data: { tipo: string, objectPath: string }) => createDocumento(animalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos', animalId] });
    }
  });

  const handleDocumentSubmit = async ({ tipo, file }: { tipo: string; file: File }) => {
    try {
      setIsUploadingDoc(true);
      const tenantId = authUser?.tenantId;
      if (!tenantId) throw new Error('No se pudo validar la finca activa.');

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !['pdf', 'png', 'jpg'].includes(fileExt)) {
        throw new Error('El documento debe ser PDF, PNG o JPG.');
      }
      if (file.size === 0 || file.size > 10 * 1024 * 1024) {
        throw new Error('El documento debe tener un tamaño mayor que 0 y máximo 10 MB.');
      }
      const category = tipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const documentId = crypto.randomUUID();
      const objectPath = `${tenantId}/${animalId}/${category}/${documentId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_ANIMAL_DOCS)
        .upload(objectPath, file);

      if (uploadError) throw uploadError;

      try {
        await documentoMutation.mutateAsync({ tipo, objectPath });
      } catch (error) {
        // Solo una respuesta HTTP 4xx confirma que la API rechazó el registro.
        // Una falla de red o 5xx puede ocurrir después del commit; borrar aquí
        // dejaría la fila confirmada apuntando a un objeto inexistente.
        if (isDefinitiveApiRejection(error)) {
          const { error: cleanupError } = await supabase.storage.from(BUCKET_ANIMAL_DOCS).remove([objectPath]);
          if (cleanupError) console.error('No se pudo retirar el archivo sin registro:', cleanupError);
        }
        throw error;
      }

      setIsDocumentoOpen(false);
    } catch (error) {
      console.error('Error al subir documento:', error);
      alert(error instanceof Error ? error.message : 'Hubo un error al subir el documento. Por favor, intente de nuevo.');
    } finally {
      setIsUploadingDoc(false);
    }
  };
  const handleDownloadPDF = () => {
    if (!animal) return;

    const doc = new jsPDF();
    let yPos = 20;

    // Título
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(`Expediente Animal: #${animal.areteInterno} ${animal.nombre || ''}${animal.numeroOficialDiio ? ` (DIIO: ${animal.numeroOficialDiio})` : ''}`, 14, yPos);
    yPos += 10;

    // Info General
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Raza: ${animal.raza?.nombre || 'N/A'}`, 14, yPos);
    doc.text(`Categoría: ${animal.categoria || 'N/A'}`, 80, yPos);
    doc.text(`Sexo: ${animal.sexo || 'N/A'}`, 150, yPos);
    yPos += 8;

    doc.text(`Peso Actual: ${animal.pesoActualKg || 0} kg`, 14, yPos);
    doc.text(`Potrero: ${animal.potrero?.nombre || 'N/A'}`, 80, yPos);
    if (animal.fechaNacimiento) {
      doc.text(`Fecha Nac.: ${formatearFechaCivil(animal.fechaNacimiento)}`, 150, yPos);
    }
    yPos += 15;

    const seccionTabla = (titulo: string, head: string[], body: string[][]) => {
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(titulo, 14, yPos);
      if (body.length > 0) {
        yPos += 5;
        autoTable(doc, {
          startY: yPos,
          head: [head],
          body,
          theme: 'striped',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [15, 23, 42] }
        });
        yPos = ((doc as jsPDF & { lastAutoTable: Table }).lastAutoTable.finalY ?? yPos) + 15;
      } else {
        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('Sin registros', 14, yPos);
        yPos += 15;
      }
    };

    seccionTabla(
      'Historial de Pesajes',
      ['Fecha', 'Peso (kg)'],
      (pesajes ?? []).map((p: Pesaje) => [
        formatearFechaCivil(p.fecha),
        p.pesoActualKg != null ? `${p.pesoActualKg} kg` : '-',
      ]),
    );

    if (animal.sexo !== 'Macho') {
      seccionTabla(
        'Historial de Producción de Leche',
        ['Fecha', 'Turno', 'Litros', 'Disposición'],
        (produccion ?? []).map((r) => [
          formatearFechaCivil(r.fecha),
          ETIQUETA_TURNO[r.turno],
          `${Number(r.litros).toFixed(1)} L`,
          r.revertido ? `${ETIQUETA_DISPOSICION[r.disposicion]} (anulado)` : ETIQUETA_DISPOSICION[r.disposicion],
        ]),
      );
    }

    // Sección: Sanitario
    if (tratamientos && tratamientos.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Historial Sanitario', 14, yPos);
      yPos += 5;

      const tableData = tratamientos.map((t: TratamientoSanitario) => [
        t.fecha ? formatearFechaCivil(t.fecha) : '-',
        t.diagnostico || '-',
        t.farmaco || '-',
        t.dosis || '-',
        t.veterinario || '-'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Enfermedad', 'Medicamento', 'Dosis', 'Responsable']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] }
      });
      yPos = ((doc as jsPDF & { lastAutoTable: Table }).lastAutoTable.finalY ?? yPos) + 15;
    } else {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Historial Sanitario', 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Sin registros', 14, yPos);
      yPos += 15;
    }

    // Sección: Reproductivo
    const serviciosActivos = estadoReproductivo?.servicioActivo ? [estadoReproductivo.servicioActivo] : [];
    if (serviciosActivos.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Historial Reproductivo', 14, yPos);
      yPos += 5;

      const tableData = serviciosActivos.map((s) => {
        return [
          s.fechaServicio ? formatearFechaCivil(s.fechaServicio) : '-',
          s.tipoServicio || '-',
          s.toroOPajilla || '-',
          estadoReproductivo?.ultimoDiagnostico?.resultado || 'Pendiente'
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Tipo', 'Toro/Semen', 'Estado']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] }
      });
      yPos = ((doc as jsPDF & { lastAutoTable: Table }).lastAutoTable.finalY ?? yPos) + 15;
    } else {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Historial Reproductivo', 14, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Sin registros', 14, yPos);
      yPos += 15;
    }

    // Descargar
    doc.save(`Expediente_${animal.areteInterno}_${hoyLocal()}.pdf`);
  };

  const isMacho = animal?.sexo === 'Macho';

  const tabs = [
    { id: 'resumen', label: 'Resumen General' },
    { id: 'sanitario', label: 'Historial Sanitario' },
    ...(!isMacho ? [{ id: 'reproductivo', label: 'Ciclo Reproductivo' }] : []),
    { id: 'produccion', label: isMacho ? 'Historial de Pesajes' : 'Pesajes y Leche' },
    { id: 'documentos', label: 'Documentos' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-navy animate-spin" />
      </div>
    );
  }

  if (isError || !animal) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center gap-4">
        <div className="text-slate-500 font-semibold">Error al cargar el expediente del animal.</div>
        <Link href="/hato" className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-bold shadow-sm hover:bg-navy-light transition-colors">Volver al Hato</Link>
      </div>
    );
  }

  // Retiros activos a partir de las fechas de liberación persistidas por el backend (MOD-02)
  interface RetiroDetalle {
    fechaLiberacion: string;
    diasRestantes: number;
    farmaco: string;
  }
  const hoyFinca = hoyLocal();
  let retiroLecheActivo: RetiroDetalle | null = null;
  let retiroCarneActivo: RetiroDetalle | null = null;

  tratamientos?.forEach((t: TratamientoSanitario) => {
    const restLeche = diasRestantesRetiro(t.fechaLiberacionLeche, hoyFinca);
    if (restLeche > 0 && (!retiroLecheActivo || restLeche > retiroLecheActivo.diasRestantes)) {
      retiroLecheActivo = { fechaLiberacion: t.fechaLiberacionLeche, diasRestantes: restLeche, farmaco: t.farmaco };
    }

    const restCarne = diasRestantesRetiro(t.fechaLiberacionCarne, hoyFinca);
    if (restCarne > 0 && (!retiroCarneActivo || restCarne > retiroCarneActivo.diasRestantes)) {
      retiroCarneActivo = { fechaLiberacion: t.fechaLiberacionCarne, diasRestantes: restCarne, farmaco: t.farmaco };
    }
  });

  const alertaRetiro: { leche: RetiroDetalle | null; carne: RetiroDetalle | null } | null =
    (retiroLecheActivo || retiroCarneActivo) ? {
      leche: retiroLecheActivo,
      carne: retiroCarneActivo,
    } : null;


  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/hato" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Volver al Hato
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsQrOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 bg-white transition-colors shadow-xs"
            >
              <QrCode className="w-4 h-4 text-navy" />
              <span>Código QR</span>
            </button>
            <RequireRole roles={['propietario', 'administrador']}>{animal.activo && (
              <button
                onClick={() => setIsBajaOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 bg-white transition-colors"
              >
                Dar de Baja
              </button>
            )}</RequireRole>
            <RequireRole roles={['propietario', 'administrador']}>
            <button
              onClick={() => setIsEditarAnimalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 bg-white transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Editar Animal
            </button>
            </RequireRole>
          </div>
        </div>

        {/* Header Principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8 flex flex-col lg:flex-row gap-6 lg:items-center justify-between">

            {/* Info Animal */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm relative shrink-0">
                {animal.fotoUrl ? (
                  <img
                    src={animal.fotoUrl}
                    alt={`Vaca ${animal.areteInterno}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-2">
                    <Camera size={32} />
                    <span className="text-sm font-bold">Sin foto</span>
                  </div>
                )}
                <div className={`absolute bottom-2 right-2 w-6 h-6 text-white rounded-full flex items-center justify-center border-2 border-white text-xs font-bold shadow-sm ${animal.sexo === 'Hembra' ? 'bg-pink-500' : 'bg-blue-500'}`}>
                  {animal.sexo === 'Hembra' ? 'H' : 'M'}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-extrabold text-navy tracking-tight">
                    #{animal.areteInterno} <span className="font-semibold text-slate-700">{animal.nombre}</span>
                  </h1>
                  {animal.numeroOficialDiio && (
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
                      DIIO: {animal.numeroOficialDiio}
                    </span>
                  )}
                  {animal.activo && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide border border-green-200">
                      ACTIVO
                    </span>
                  )}
                </div>

                <p className="text-slate-600 font-medium">
                  {animal.raza?.nombre || 'Raza Desconocida'}
                </p>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                  <p><span className="font-bold text-navy">{animal.pesoActualKg || 0} kg</span> <span className="text-slate-400">— Peso actual</span></p>
                  <p className="font-semibold">{animal.categoria || 'Sin Categoría'}</p>
                  <p className="font-semibold">{animal.potrero?.nombre || 'Sin Potrero'}</p>
                  {animal.fechaNacimiento && (
                    <p>{formatearFechaCivil(animal.fechaNacimiento)}</p>
                  )}
                  {animal.padreId && <p>Padre: <span className="font-semibold">{animal.padreId}</span></p>}
                  {animal.madreId && (
                    <p>Madre: <span className="font-semibold text-primary">{animal.madre?.areteInterno ? `#${animal.madre.areteInterno} ${animal.madre.nombre || ''}` : animal.madreId}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              <RequireRole roles={['propietario', 'administrador', 'peon']}><button
                onClick={() => setIsPesajeOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-navy text-white rounded-lg text-sm font-bold shadow-sm hover:bg-navy-light transition-colors"
              >
                Registrar Pesaje
              </button></RequireRole>
              {!isMacho && <RequireRole roles={['propietario', 'administrador', 'peon', 'veterinario']}>
                <button
                  onClick={() => setIsServicioOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors"
                >
                  Registrar Servicio
                </button>
              </RequireRole>}
              <RequireRole roles={['propietario', 'administrador', 'peon', 'veterinario']}><button
                onClick={() => setIsTratamientoOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 transition-colors"
              >
                Aplicar Tratamiento
              </button></RequireRole>
              <button
                onClick={handleDownloadPDF}
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors"
              >
                Descargar PDF
              </button>
              <button
                onClick={() => setIsQrOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 text-navy rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4 text-navy" />
                <span>Generar QR</span>
              </button>
            </div>
          </div>

          {/* Dots Timeline (Mockups comentados para no confundir al usuario con datos falsos) */}
          {/*
          <div className="bg-slate-50 border-t border-slate-200 p-3 sm:px-8 flex flex-wrap items-center gap-6 text-[13px]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-slate-600">Próxima Palpación: <span className="font-bold text-orange-500">24/02/2026</span> <span className="font-bold text-slate-400">· -179 días</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-slate-600">Secado: <span className="font-bold text-purple-600">01/09/2026</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-slate-600">FPP: <span className="font-bold text-green-600">15/10/2026</span> <span className="text-slate-400">· 54 días</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-slate-600">Retiro hasta: <span className="font-bold text-red-600">24/08/2026</span> <span className="text-slate-400">· 2 días</span></span>
            </div>
          </div>
          */}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="py-2">
          {activeTab === 'resumen' && (
            <div className="space-y-6">

              {alertaRetiro && (
                <div className="bg-danger-bg border border-danger/30 rounded-xl p-5 flex items-start gap-4 shadow-sm mb-6">
                  <AlertTriangle className="w-6 h-6 text-danger shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-danger tracking-wide uppercase">
                        Retiro Sanitario Activo
                      </h3>
                      <span className="text-xs font-bold text-danger bg-white/70 px-2.5 py-0.5 rounded-full border border-danger/20">
                        Venta Restringida
                      </span>
                    </div>
                    {alertaRetiro.leche && (
                      <p className="text-sm font-medium text-danger">
                        <strong>Retiro Leche:</strong> Hasta <span className="font-bold">{formatearFecha(alertaRetiro.leche.fechaLiberacion)}</span> ({alertaRetiro.leche.diasRestantes} días restantes) — Fármaco: <span className="font-bold">{alertaRetiro.leche.farmaco}</span>. <span className="text-[11px] font-bold uppercase tracking-wider bg-danger text-white px-1.5 py-0.5 rounded ml-1">Leche no comercializable (descarte)</span>
                      </p>
                    )}
                    {alertaRetiro.carne && (
                      <p className="text-sm font-medium text-danger">
                        <strong>Retiro Carne:</strong> Hasta <span className="font-bold">{formatearFecha(alertaRetiro.carne.fechaLiberacion)}</span> ({alertaRetiro.carne.diasRestantes} días restantes) — Fármaco: <span className="font-bold">{alertaRetiro.carne.farmaco}</span>
                      </p>
                    )}
                    <p className="text-xs text-danger/80">
                      Normativa SENASA / Costa Rica: No comercializar leche ni carne de animales en periodo de supresión farmacológica.
                    </p>
                  </div>
                </div>
              )}

              {/* Pedigrí y Genealogía */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm relative">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-lg font-bold text-navy">Pedigrí y Genealogía</h3>
                    <p className="text-sm text-slate-500">Origen: <span className="font-semibold text-slate-700">{animal.origen}</span></p>
                  </div>
                  <button
                    onClick={() => setIsOrigenOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar Origen
                  </button>
                </div>

                {/* Tree UI Mock */}
                <div className="relative max-w-4xl mx-auto flex flex-col items-center">

                  {/* Central Node */}
                  <div className="bg-navy text-white rounded-xl py-3 px-6 text-center z-10 shadow-md border-2 border-white">
                    <div className="font-bold">#{animal.areteInterno} {animal.nombre}</div>
                    <div className="text-[10px] text-sky-200 mt-0.5">{animal.raza?.nombre}</div>
                  </div>

                  {/* Vertical Line */}
                  <div className="w-px h-8 bg-slate-300 my-2"></div>

                  {/* Horizontal Line connecting Parents */}
                  <div className="w-[80%] h-px bg-slate-300 relative">
                    <div className="absolute top-1/2 left-0 w-px h-6 bg-slate-300"></div>
                    <div className="absolute top-1/2 right-0 w-px h-6 bg-slate-300"></div>
                  </div>

                  {/* Parents Grid */}
                  <div className="w-full flex justify-between mt-6 px-4 sm:px-10">

                    {/* Padre */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 w-[45%] shadow-sm hover:border-slate-300 transition-colors">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Padre (Semental / Pajilla)</div>
                      <div className="font-bold text-navy text-base">{animal.padreId ? `Semental #${animal.padreId}` : 'No registrado'}</div>
                      <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
                      </div>
                    </div>

                    {/* Madre */}
                    <div className="bg-green-50/30 border border-green-200 rounded-xl p-4 w-[45%] shadow-sm hover:border-green-300 transition-colors">
                      <div className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1">Madre (Vaca Matriz / Dam)</div>
                      <div className="font-bold text-navy text-base">
                        {animal.madre ? `Matriz #${animal.madre.areteInterno} ${animal.madre.nombre || ''}` : (animal.madreId ? `Matriz (ID: ${animal.madreId})` : 'No registrada')}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Descendencia Registrada */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-navy">Descendencia Registrada</h3>
                  <span className="w-6 h-6 rounded bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">0</span>
                </div>
                <p className="text-sm text-slate-500 mb-8">Crías registradas en el sistema donde este animal figura como padre o madre.</p>

                <div className="py-10 flex flex-col items-center justify-center text-center opacity-60">
                  <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-300 mb-4">
                    <Plus className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">No se registran crías ni partos para este animal.</p>
                </div>
              </div>

              {/* Línea de Tiempo Gestación - Solo Hembras */}
              {!isMacho && <LineaTiempoGestacion estado={estadoReproductivo} />}

            </div>
          )}

          {activeTab === 'sanitario' && (
            <div className="space-y-6 mt-6">
              {estadoSanitario && <BadgesRetiro estado={estadoSanitario} />}
              {estadoSanitario?.enRetiro ? (
                <div className="bg-danger-bg border border-danger/30 rounded-xl p-5 flex items-start gap-4 shadow-sm">
                  <AlertTriangle className="w-6 h-6 text-danger shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h3 className="text-sm font-extrabold text-danger tracking-wide uppercase">
                        Retiro Sanitario Activo
                      </h3>
                      {estadoSanitario.tratamientoReferencia && (
                        <span className="text-xs font-bold text-danger bg-white/70 px-2.5 py-0.5 rounded-full border border-danger/20">
                          {estadoSanitario.tratamientoReferencia.farmaco}
                        </span>
                      )}
                    </div>
                    {estadoSanitario.liberacionLeche && estadoSanitario.diasRestantesLeche > 0 && (
                      <p className="text-sm text-danger/90">
                        <strong>Retiro Leche:</strong> Hasta{' '}
                        <span className="font-bold">{formatearFecha(estadoSanitario.liberacionLeche)}</span>{' '}
                        ({estadoSanitario.diasRestantesLeche} días restantes)
                      </p>
                    )}
                    {estadoSanitario.liberacionCarne && estadoSanitario.diasRestantesCarne > 0 && (
                      <p className="text-sm text-danger/90">
                        <strong>Retiro Carne:</strong> Hasta{' '}
                        <span className="font-bold">{formatearFecha(estadoSanitario.liberacionCarne)}</span>{' '}
                        ({estadoSanitario.diasRestantesCarne} días restantes)
                      </p>
                    )}
                  </div>
                </div>
              ) : estadoSanitario ? (
                <div className="bg-success-bg border border-success/30 rounded-xl p-5 flex items-start gap-4 shadow-sm">
                  <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-extrabold text-success tracking-wide uppercase">
                      Estado Sanitario: Apto
                    </h3>
                    <p className="text-sm text-success/90 mt-1">
                      Sin periodos de retiro vigentes para leche ni carne.
                    </p>
                  </div>
                </div>
              ) : null}

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 flex items-center justify-between border-b border-slate-100 bg-surface">
                <div>
                  <h3 className="text-lg font-bold text-navy">Historial Sanitario y Tratamientos</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Registro cronológico de aplicaciones veterinarias y periodos de retiro oficial
                  </p>
                </div>
                <RequireRole roles={['propietario', 'administrador', 'peon', 'veterinario']}><button
                  onClick={() => {
                    setTratamientoSeleccionado(null);
                    setIsTratamientoOpen(true);
                  }}
                  className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-bold shadow-sm hover:bg-danger/90 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Aplicar Tratamiento
                </button></RequireRole>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4 pl-6 sm:pl-8">Fecha</th>
                      <th className="p-4">Fármaco</th>
                      <th className="p-4">Diagnóstico</th>
                      <th className="p-4">Dosis / Vía</th>
                      <th className="p-4">Médico</th>
                      <th className="p-4">Retiro Leche</th>
                      <th className="p-4">Retiro Carne</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 pr-6 sm:pr-8 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {tratamientos?.map((t: TratamientoSanitario) => {
                      const dLeche = t.diasRetiroLeche;
                      const dCarne = t.diasRetiroCarne;
                      const libLeche = t.fechaLiberacionLeche;
                      const libCarne = t.fechaLiberacionCarne;
                      const restLeche = diasRestantesRetiro(libLeche, hoyFinca);
                      const restCarne = diasRestantesRetiro(libCarne, hoyFinca);
                      const estaEnRetiro = restLeche > 0 || restCarne > 0;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 pl-6 sm:pl-8 font-medium text-slate-700">
                            {formatearFecha(t.fecha)}
                            {t.fechaUltimaAdministracion && t.fechaUltimaAdministracion !== t.fecha && (
                              <span className="text-xs text-slate-400 block">
                                Última: {formatearFecha(t.fechaUltimaAdministracion)}
                              </span>
                            )}
                            {t.eventoCorrigeId && (
                              <span className="text-[11px] font-semibold text-info block">Corregido</span>
                            )}
                          </td>
                          <td className="p-4 font-bold text-navy">{t.farmaco}</td>
                          <td className="p-4">{t.diagnostico}</td>
                          <td className="p-4">
                            <span className="font-medium text-slate-700">{t.dosis}</span>
                            {t.via && <span className="text-xs text-slate-400 block">{t.via}</span>}
                          </td>
                          <td className="p-4 text-sky-700">{t.veterinario || '-'}</td>
                          <td className="p-4">
                            {dLeche > 0 ? (
                              <div>
                                <span className={`font-bold ${restLeche > 0 ? 'text-danger' : 'text-slate-600'}`}>
                                  {dLeche}d
                                </span>
                                {libLeche && (
                                  <span className="text-xs text-slate-400 block">
                                    Lib: {formatearFecha(libLeche)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">0d</span>
                            )}
                          </td>
                          <td className="p-4">
                            {dCarne > 0 ? (
                              <div>
                                <span className={`font-bold ${restCarne > 0 ? 'text-danger' : 'text-slate-600'}`}>
                                  {dCarne}d
                                </span>
                                {libCarne && (
                                  <span className="text-xs text-slate-400 block">
                                    Lib: {formatearFecha(libCarne)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">0d</span>
                            )}
                          </td>
                          <td className="p-4">
                            {estaEnRetiro ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-danger-bg text-danger border border-danger/30 uppercase tracking-wide">
                                En Retiro
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-bg text-success border border-success/30 uppercase tracking-wide">
                                Cumplido
                              </span>
                            )}
                          </td>
                          <td className="p-4 pr-6 sm:pr-8 text-right space-x-3">
                            {t.documentoUrl && (
                              <DocumentoTratamientoLink
                                documento={t.documentoUrl}
                                className="text-info hover:text-navy transition-colors inline-block"
                              >
                                <FileText className="w-4 h-4" aria-label="Ver comprobante adjunto" />
                              </DocumentoTratamientoLink>
                            )}
                            <AccionesTratamiento
                              onCorregir={() => {
                                setTratamientoSeleccionado(t);
                                setIsTratamientoOpen(true);
                              }}
                              onAnular={() => {
                                anularTratamientoMutation.reset();
                                setMotivoAnulacion('');
                                setTratamientoAAnular(t);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {(!tratamientos || tratamientos.length === 0) && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          No hay tratamientos veterinarios registrados para este animal.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          )}

          {activeTab === 'reproductivo' && (
            <TabReproductivo animalId={animalId} sexo={animal.sexo} />
          )}

          {activeTab === 'produccion' && (
            <TabProduccion
              animalId={animalId}
              animalLabel={`#${animal.areteInterno}${animal.nombre ? ` ${animal.nombre}` : ''}`}
              isMacho={isMacho}
              pesajes={pesajes}
              onRegistrarPesaje={() => setIsPesajeOpen(true)}
            />
          )}

          {activeTab === 'documentos' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-navy">Documentos del Animal</h3>
                <RequireRole roles={['propietario', 'administrador']}>
                  <button
                    onClick={() => setIsDocumentoOpen(true)}
                    className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-bold shadow-sm hover:bg-navy-light transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Documento
                  </button>
                </RequireRole>
              </div>
              <div className="p-6">
                {!documentosDocumentos || documentosDocumentos.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-3 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                    <p className="text-sm">No hay documentos registrados</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {documentosDocumentos.map((doc: DocumentoAnimal) => (
                      <div key={doc.id} className="border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                        <div className="flex-1">
                          <div className="w-10 h-10 rounded-lg bg-navy/5 border border-navy/10 flex items-center justify-center text-navy mb-4">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-navy text-sm mb-1">{doc.tipo}</h4>
                          <p className="text-xs text-slate-400">
                            Cargado el {formatearFechaCivil(doc.createdAt)}
                          </p>
                        </div>
                        <div className="mt-5 pt-4 border-t border-slate-100">
                          {doc.objectPath ? <DocumentLink
                            objectPath={doc.objectPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all"
                          >
                            <Download className="w-3 h-3" />
                            Ver / Descargar
                          </DocumentLink> : <span className="text-xs text-slate-500">Documento pendiente de migración segura.</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ModalEditarAnimal
        isOpen={isEditarAnimalOpen}
        onClose={() => setIsEditarAnimalOpen(false)}
        animal={animal}
      />

      <ModalPesaje
        isOpen={isPesajeOpen}
        onClose={() => setIsPesajeOpen(false)}
        onSubmit={(data) => pesajeMutation.mutateAsync(data)}
      />
      <ModalServicio
        isOpen={isServicioOpen}
        onClose={() => setIsServicioOpen(false)}
        onSubmit={(data) => servicioMutation.mutate(data)}
      />
      <ModalDiagnostico
        isOpen={isDiagnosticoOpen}
        onClose={() => setIsDiagnosticoOpen(false)}
        onSubmit={(data) => diagnosticoMutation.mutate(data)}
        eventoServicioId={diagnosticoServicioId}
      />
      <ModalTratamiento
        isOpen={isTratamientoOpen}
        onClose={() => {
          setIsTratamientoOpen(false);
          setTratamientoSeleccionado(null);
        }}
        initialData={tratamientoSeleccionado}
        animalSexo={animal?.sexo}
        animalId={animalId}
        tenantId={authUser?.tenantId}
        onSubmit={(data) =>
          tratamientoSeleccionado
            ? corregirTratamientoMutation.mutateAsync({ id: tratamientoSeleccionado.id, data })
            : tratamientoMutation.mutateAsync(data)
        }
      />
      {tratamientoAAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4">
          <form
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              anularTratamientoMutation.mutate({ id: tratamientoAAnular.id, motivo: motivoAnulacion.trim() });
            }}
          >
            <div>
              <h2 className="text-lg font-bold text-navy">Anular tratamiento</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tratamientoAAnular.farmaco} — {formatearFecha(tratamientoAAnular.fecha)}. El registro se conserva en el historial auditable y deja de contar para el retiro.
              </p>
            </div>
            {anularTratamientoMutation.isError && (
              <div className="p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-xs font-medium">
                {anularTratamientoMutation.error instanceof Error
                  ? anularTratamientoMutation.error.message
                  : 'No se pudo anular el tratamiento.'}
              </div>
            )}
            <label className="block space-y-1.5">
              <span className="block text-sm font-semibold text-navy">Motivo *</span>
              <textarea
                required
                minLength={3}
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-light text-slate-700"
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="ej. Registrado en el animal equivocado"
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTratamientoAAnular(null)}
                disabled={anularTratamientoMutation.isPending}
                className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={anularTratamientoMutation.isPending || motivoAnulacion.trim().length < 3}
                className="px-5 py-2 bg-danger text-white rounded-lg text-sm font-semibold hover:bg-danger/90 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {anularTratamientoMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Anular
              </button>
            </div>
          </form>
        </div>
      )}
      <ModalEditarOrigen
        isOpen={isOrigenOpen}
        onClose={() => setIsOrigenOpen(false)}
        animal={animal}
        onSubmit={(data) => {
          updateAnimalMutation.mutate({
            origen: data.origen,
            padreId: data.padre || null,
            madreId: data.madre || null,
            compradoA: data.compradoA || null,
            fechaCompra: data.fechaCompra || null,
            valorCompraCrc: data.valorCompraCrc || null,
            numeroGuia: data.numeroGuia || null,
          });
        }}
      />
      <ModalDocumento
        isOpen={isDocumentoOpen}
        onClose={() => setIsDocumentoOpen(false)}
        onSubmit={handleDocumentSubmit}
        isUploading={isUploadingDoc}
      />

      {isEditarAnimalOpen && (
        <ModalEditarAnimal
          isOpen={isEditarAnimalOpen}
          onClose={() => setIsEditarAnimalOpen(false)}
          animal={animal}
        />
      )}

      {isBajaOpen && (
        <ModalDarBaja
          isOpen={isBajaOpen}
          onClose={() => setIsBajaOpen(false)}
          animal={animal}
        />
      )}

      {isQrOpen && (
        <ModalQrAnimal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          animal={animal}
          nombreFinca={authUser?.nombreFinca}
        />
      )}

    </div>
  );
}
