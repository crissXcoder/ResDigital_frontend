"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  ShieldAlert,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { useAnimalesEnRetiro } from "@/lib/hooks/use-dashboard-data";
import { useProximosEventosFinca } from "@/lib/hooks/use-reproductivo";
import { useQuery } from "@tanstack/react-query";
import { getAnimales, Animal } from "@/lib/api/animales";
import { hoyLocal, formatearFecha } from "@/lib/reproductivo/fechas";
import { exportarRetirosPdf } from "@/lib/reportes/retiros-pdf";
import { exportarReproductivoPdf } from "@/lib/reportes/reproductivo-pdf";
import { SelectorAnimalReporte } from "@/components/reportes/selector-animal-reporte";
import type { TipoEventoFeed } from "@/lib/reproductivo/tipos";

/**
 * Centro de Reportes y Exportaciones de la Finca (MOD-07 / REPORT-T001 / REPORT-T002).
 *
 * Módulo centralizado y especializado para la exportación de documentos técnicos
 * de la finca sin recargar el Dashboard de controles de descarga pesados.
 *
 * Reglas de la bóveda:
 * 1. Todos los reportes provienen de consultas a la API real (cero datos simulados).
 * 2. No se titulan como "oficiales" (son documentos técnicos de gestión interna).
 * 3. Incorporan fecha local civil de Costa Rica, identificación de finca y descargo legal (LEG-T001).
 */
const COOLDOWN_DESCARGA_MS = 400;

/**
 * jsPDF es síncrono: un guard de "está ejecutándose" no evita un doble clic
 * real, porque el primer clic ya terminó (y se desbloqueó) antes de que el
 * segundo evento de clic pueda procesarse en un entorno de un solo hilo.
 * Por eso el botón se mantiene deshabilitado un breve lapso tras generar el
 * PDF, suficiente para absorber un doble clic humano sin crear una espera
 * perceptible para el usuario.
 */
function useDescargaConCooldown(generarPdf: () => void) {
  const bloqueadoRef = useRef(false);
  const [generando, setGenerando] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const descargar = () => {
    if (bloqueadoRef.current) return;
    bloqueadoRef.current = true;
    setGenerando(true);
    generarPdf();
    timeoutRef.current = setTimeout(() => {
      bloqueadoRef.current = false;
      setGenerando(false);
    }, COOLDOWN_DESCARGA_MS);
  };

  return { generando, descargar };
}

export default function ReportesPage() {
  const { user } = useAuthUser();

  // ─── 1. Estado y Datos para Reporte Sanitario (Retiros Activos) ─────────────
  const { data: retiros, isLoading: loadingRetiros, isError: errorRetiros } = useAnimalesEnRetiro();
  const listaRetiros = retiros ?? [];
  const retirosLeche = listaRetiros.filter(
    (r) => r.diasRestantesLeche !== null && (r.diasRestantesLeche ?? 0) > 0,
  ).length;
  const retirosCarne = listaRetiros.filter(
    (r) => r.diasRestantesCarne !== null && (r.diasRestantesCarne ?? 0) > 0,
  ).length;

  const { generando: generandoRetiros, descargar: handleDescargarRetiros } = useDescargaConCooldown(
    () => exportarRetirosPdf(listaRetiros, user?.nombreFinca),
  );

  // ─── 2. Estado y Datos para Reporte Reproductivo ──────────────────────────
  const [diasVentanaRepro, setDiasVentanaRepro] = useState<number>(60);
  const [filtroHitoRepro, setFiltroHitoRepro] = useState<TipoEventoFeed | "Todos">("Todos");
  const { data: eventosRepro, isLoading: loadingRepro, isError: errorRepro } = useProximosEventosFinca(diasVentanaRepro);

  const listaRepro = eventosRepro ?? [];
  const reproFiltrados =
    filtroHitoRepro === "Todos"
      ? listaRepro
      : listaRepro.filter((e) => e.tipo === filtroHitoRepro);

  const urgentesRepro = reproFiltrados.filter((e) => e.urgente).length;
  const vencidosRepro = reproFiltrados.filter((e) => e.diasRestantes < 0).length;

  const { generando: generandoRepro, descargar: handleDescargarReproductivo } = useDescargaConCooldown(
    () =>
      exportarReproductivoPdf({
        eventos: listaRepro,
        diasVentana: diasVentanaRepro,
        filtro: filtroHitoRepro,
        nombreFinca: user?.nombreFinca,
      }),
  );

  // ─── 3. Estado y Datos para Expediente Individual ────────────────────────
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("");
  const { data: animales = [], isLoading: loadingAnimales } = useQuery<Animal[]>({
    queryKey: ["animales-selector-reportes"],
    queryFn: () => getAnimales(),
  });

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* Encabezado Principal */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Centro de Reportes y Exportaciones
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Informes técnicos de gestión, auditoría interna y control biológico de la finca.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs bg-white text-slate-700 py-1 px-3">
            Finca: <span className="font-semibold ml-1">{user?.nombreFinca || "Finca activa"}</span>
          </Badge>
          <Badge variant="outline" className="text-xs bg-white text-slate-700 py-1 px-3">
            Emisión: <span className="font-mono ml-1">{hoyLocal()}</span> (Costa Rica)
          </Badge>
        </div>
      </header>

      {/* Grid de Reportes Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* REPORTE 2: Retiros Sanitarios Activos */}
        <Card className="flex flex-col border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-col gap-2 pb-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-lg shrink-0">
                  <ShieldAlert className="size-5" />
                </div>
                <CardTitle className="text-lg">Retiros Sanitarios Activos</CardTitle>
              </div>
              <Badge variant={listaRetiros.length > 0 ? "warning" : "success"} className="text-xs shrink-0">
                {listaRetiros.length > 0 ? `${listaRetiros.length} bajo retiro` : "0 restricciones"}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Genera el informe técnico de animales con restricciones de ordeño (leche) o faena/venta (carne) derivadas de tratamientos veterinarios recientes.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 justify-between gap-6 pt-0">
            <div className="space-y-4">
              {errorRetiros ? <p role="alert">No se pudo consultar el retiro sanitario. Reintentá antes de descargar.</p> : loadingRetiros ? (
                <div className="h-16 animate-pulse bg-slate-100 rounded-lg" />
              ) : listaRetiros.length === 0 ? (
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Hato libre de retiros:</strong> La exportación generará una constancia técnica de cero animales bajo restricción a la fecha de hoy.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <div>
                      <span className="text-[11px] text-slate-600 block">Total Animales</span>
                      <span className="text-base font-bold text-slate-900">{listaRetiros.length}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-600 block">Bloqueo Leche</span>
                      <span className="text-base font-bold text-amber-700">{retirosLeche}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-600 block">Bloqueo Carne</span>
                      <span className="text-base font-bold text-red-700">{retirosCarne}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {listaRetiros.map((r) => (
                      <span
                        key={r.animalId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium"
                      >
                        <span className="font-bold text-navy">#{r.arete}</span> {r.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-600">Formato: PDF Ejecutivo</span>
              <button
                type="button"
                onClick={handleDescargarRetiros}
                disabled={loadingRetiros || errorRetiros || generandoRetiros}
                aria-label="Descargar reporte PDF Retiros"
                className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navy-light transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Download className="size-3.5" />
                {generandoRetiros ? "Generando..." : "Descargar reporte PDF"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* REPORTE 3: Programación Reproductiva y Partos */}
        <Card className="flex flex-col border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-col gap-2 pb-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
                  <Calendar className="size-5" />
                </div>
                <CardTitle className="text-lg">Programación Reproductiva</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 shrink-0">
                {reproFiltrados.length} hitos en ventana
              </Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cronograma de eventos reproductivos: palpaciones diagnósticas, secados sugeridos, avisos de preparación de parto (FPP-15) y partos proyectados.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 justify-between gap-6 pt-0">
            <div className="space-y-4">
              {/* Parámetros interactivos del reporte */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <label htmlFor="horizonte-temporal-repro" className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Horizonte Temporal
                  </label>
                  <select
                    id="horizonte-temporal-repro"
                    value={diasVentanaRepro}
                    onChange={(e) => setDiasVentanaRepro(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-200 rounded-md py-1.5 px-2 text-slate-800"
                  >
                    <option value={30}>Próximos 30 días</option>
                    <option value={60}>Próximos 60 días (recomendado)</option>
                    <option value={90}>Próximos 90 días</option>
                    <option value={180}>Próximos 180 días</option>
                    <option value={365}>Próximo año (365 días)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="filtro-hito-repro" className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Filtro por Hito
                  </label>
                  <select
                    id="filtro-hito-repro"
                    value={filtroHitoRepro}
                    onChange={(e) => setFiltroHitoRepro(e.target.value as TipoEventoFeed | "Todos")}
                    className="w-full text-xs bg-white border border-slate-200 rounded-md py-1.5 px-2 text-slate-800"
                  >
                    <option value="Todos">Todos los hitos</option>
                    <option value="Palpación">Solo Palpaciones</option>
                    <option value="Secado">Solo Secados</option>
                    <option value="Aviso Parto">Avisos Parto (FPP-15)</option>
                    <option value="Aviso Parto Urgente">Avisos Urgentes (FPP-3)</option>
                    <option value="Parto">Solo Partos FPP</option>
                  </select>
                </div>
              </div>

              {errorRepro ? <p role="alert">No se pudo consultar el calendario reproductivo. Reintentá antes de descargar.</p> : loadingRepro ? (
                <div className="h-10 animate-pulse bg-slate-100 rounded-lg" />
              ) : (
                <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                  <span>
                    Avisos urgentes: <strong className="text-red-700">{urgentesRepro}</strong>
                  </span>
                  <span>
                    Tareas vencidas: <strong className="text-amber-700">{vencidosRepro}</strong>
                  </span>
                  <span>
                    Total filtrado: <strong>{reproFiltrados.length}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-600">Formato: PDF Cronológico</span>
              <button
                type="button"
                onClick={handleDescargarReproductivo}
                disabled={loadingRepro || errorRepro || reproFiltrados.length === 0 || generandoRepro}
                aria-label="Descargar reporte PDF Reproductivo"
                className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navy-light transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Download className="size-3.5" />
                {generandoRepro ? "Generando..." : "Descargar reporte PDF"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* REPORTE 1: Expediente Individual de Animal */}
        <Card className="flex flex-col border-slate-200 shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 pb-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
                  <Users className="size-5" />
                </div>
                <CardTitle className="text-lg">Expediente Individual de Animal</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 shrink-0">
                {animales.length} animales registrados
              </Badge>
            </div>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Descarga el historial oficial completo de cualquier ejemplar: identificación oficial DIIO, genealogía, trazabilidad de pesajes, registros sanitarios con lote de medicamentos y ciclo reproductivo vigente.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-0">
            <SelectorAnimalReporte
              animales={animales}
              isLoading={loadingAnimales}
              selectedAnimalId={selectedAnimalId}
              nombreFinca={user?.nombreFinca}
              onSelectAnimal={(a) => setSelectedAnimalId(a?.id || "")}
            />

            <div className="text-[11px] text-slate-600 flex items-center gap-2">
              <Info className="size-3.5 text-slate-600 shrink-0" />
              <span>
                Selecciona cualquier ejemplar para descargar de forma inmediata su expediente clínico e histórico en PDF. También puedes pulsar en <strong>&quot;Ver en Hato&quot;</strong> si requieres consultar gráficos o registrar eventos clínicos en vivo.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banner Informativo y Marco Legal (LEG-T001 / REPORT-T001) */}
      <footer className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs text-xs text-slate-600 flex items-start gap-3">
        <AlertTriangle className="size-4 text-slate-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-700">Marco Legal y Alcance Regulatorio</p>
          <p className="leading-relaxed">
            Los informes generados por esta plataforma son documentos técnicos para el control, auditoría interna y gestión operativa de la finca. En cumplimiento de las normativas de inocuidad y la Ley N° 8968 de Costa Rica, estos reportes reflejan exclusivamente los datos asentados en la bitácora del sistema y no sustituyen certificados oficiales expedidos por el Servicio Nacional de Salud Animal (SENASA) ni asesoría médico-veterinaria.
          </p>
        </div>
      </footer>
    </div>
  );
}
