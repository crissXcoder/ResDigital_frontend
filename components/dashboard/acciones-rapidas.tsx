"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Search, X } from "lucide-react";
import ModalProduccionLeche from "@/components/modals/ModalProduccionLeche";
import ModalServicio, { type ServicioFormData } from "@/components/modals/ModalServicio";
import ModalTratamiento, { type TratamientoFormData } from "@/components/modals/ModalTratamiento";
import {
  type Animal,
  createServicioReproductivo,
  getAnimales,
} from "@/lib/api/animales";
import { createProduccionLeche } from "@/lib/api/produccion";
import {
  createTratamiento,
  toCreateTratamientoPayload,
} from "@/lib/api/sanitary";
import { useAuthUser, type RolUsuario } from "@/lib/hooks/useAuthUser";

export type TipoAccionRapida = "tratamiento" | "reproductivo" | "leche";

export const ROLES_PERMITIDOS_ACCION: Record<TipoAccionRapida, RolUsuario[]> = {
  tratamiento: ["propietario", "administrador", "peon", "veterinario"],
  reproductivo: ["propietario", "administrador", "peon", "veterinario"],
  leche: ["propietario", "administrador", "peon"],
};

export function puedeEjecutarAccion(
  accion: TipoAccionRapida,
  rol: RolUsuario | null | undefined,
): boolean {
  if (!rol) return false;
  return ROLES_PERMITIDOS_ACCION[accion]?.includes(rol) ?? false;
}

interface AccionConfig {
  titulo: string;
  subtitulo: string;
  tituloSelector: string;
  descripcionSelector: string;
}

const CONFIG_ACCIONES: Record<TipoAccionRapida, AccionConfig> = {
  tratamiento: {
    titulo: "Registrar Tratamiento Médico",
    subtitulo: "Aplicar fármaco y programar retiro",
    tituloSelector: "Seleccionar Animal para Tratamiento",
    descripcionSelector: "Elige el animal activo al que deseas aplicarle el medicamento.",
  },
  reproductivo: {
    titulo: "Nuevo Evento Reproductivo",
    subtitulo: "Registrar celo, IA o monta",
    tituloSelector: "Seleccionar Hembra para Evento Reproductivo",
    descripcionSelector: "Elige una hembra activa para registrar su celo o servicio.",
  },
  leche: {
    titulo: "Registrar Producción de Leche",
    subtitulo: "Solo hembras en lactancia",
    tituloSelector: "Seleccionar Hembra para Registro de Leche",
    descripcionSelector: "Elige la hembra activa para registrar los litros del turno.",
  },
};

/**
 * Sección "Acciones Rápidas" del Dashboard con flujo completo:
 * 1. Tarjetas en diseño sobrio/neutral.
 * 2. Al pulsar cualquier acción, abre un selector modal de animales con búsqueda.
 * 3. Al seleccionar un animal, despliega directamente el formulario modal oficial
 *    (ModalTratamiento, ModalServicio o ModalProduccionLeche) sin tener que ir a las tablas.
 * 4. Guarda a través de la API y refresca los datos del Dashboard.
 */
/**
 * Filtra los animales según la acción rápida seleccionada y el texto de búsqueda.
 *
 * Reglas de negocio:
 * 1. Solo animales activos (`activo: true`). Animales de baja/fallecidos nunca se listan.
 * 2. Criterio biológico: "reproductivo" y "leche" solo admiten hembras (`sexo === 'Hembra'`).
 * 3. Búsqueda libre insensible a mayúsculas sobre `areteInterno`, `nombre` o `categoria`.
 */
export function filtrarAnimalesAccion(
  animales: Animal[],
  accionActiva: TipoAccionRapida | null,
  busqueda: string,
): Animal[] {
  if (!accionActiva) return [];

  let lista = animales.filter((a) => a.activo);

  // Reproductivo y Leche aplican solo a hembras
  if (accionActiva === "reproductivo" || accionActiva === "leche") {
    lista = lista.filter((a) => a.sexo?.toLowerCase() === "hembra");
  }

  if (!busqueda.trim()) return lista;

  const term = busqueda.trim().toLowerCase();
  return lista.filter(
    (a) =>
      a.areteInterno.toLowerCase().includes(term) ||
      (a.nombre && a.nombre.toLowerCase().includes(term)) ||
      (a.categoria && a.categoria.toLowerCase().includes(term)),
  );
}

export function AccionesRapidas() {
  const queryClient = useQueryClient();
  const { role, user } = useAuthUser();

  // Estados del flujo
  const [accionActiva, setAccionActiva] = useState<TipoAccionRapida | null>(null);
  const [animalSeleccionado, setAnimalSeleccionado] = useState<Animal | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Bloqueo de scroll del fondo (dashboard) mientras el selector o el formulario estén abiertos
  useEffect(() => {
    if (accionActiva !== null) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [accionActiva]);

  // Cargar animales registrados del hato
  const { data: animales = [], isLoading: isLoadingAnimales } = useQuery({
    queryKey: ["animales"],
    queryFn: () => getAnimales(),
  });

  // Mutación: Registrar Tratamiento
  const tratamientoMutation = useMutation({
    mutationFn: (data: TratamientoFormData) => {
      const payload = toCreateTratamientoPayload(data as unknown as Record<string, unknown>, animalSeleccionado!.id);
      return createTratamiento(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["animales"] });
      queryClient.invalidateQueries({ queryKey: ["tratamientos"] });
      queryClient.invalidateQueries({ queryKey: ["historialSanitario"] });
      queryClient.invalidateQueries({ queryKey: ["estadoSanitario"] });
      cerrarTodoConExito("Tratamiento médico registrado correctamente");
    },
    onError: (error: unknown) => {
      console.error("Error al registrar tratamiento:", error);
    },
  });

  // Mutación: Registrar Evento Reproductivo (Servicio)
  const servicioMutation = useMutation({
    mutationFn: (data: ServicioFormData) => {
      return createServicioReproductivo(animalSeleccionado!.id, {
        fechaEvento: data.fecha,
        tipoServicio: data.tipo_servicio,
        toroOPajilla: data.semental,
        responsable: data.inseminador,
        notas: data.observaciones
          ? `Potrero: ${data.potrero || "N/A"} - ${data.observaciones}`
          : data.potrero
            ? `Potrero: ${data.potrero}`
            : "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["estadoReproductivo"] });
      queryClient.invalidateQueries({ queryKey: ["reproductivo"] });
      queryClient.invalidateQueries({ queryKey: ["animales"] });
      cerrarTodoConExito("Evento reproductivo registrado correctamente");
    },
    onError: (error: unknown) => {
      console.error("Error al registrar servicio reproductivo:", error);
    },
  });

  // Mutación: Registrar Producción de Leche
  const produccionMutation = useMutation({
    mutationFn: createProduccionLeche,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["produccionLeche"] });
      queryClient.invalidateQueries({ queryKey: ["animales"] });
      cerrarTodoConExito("Producción de leche registrada correctamente");
    },
    onError: (error: unknown) => {
      console.error("Error al registrar producción de leche:", error);
    },
  });

  const cerrarTodoConExito = (mensaje: string) => {
    setIsFormOpen(false);
    setAccionActiva(null);
    const arete = animalSeleccionado?.areteInterno ?? "";
    const nombre = animalSeleccionado?.nombre ? ` (${animalSeleccionado.nombre})` : "";
    setAnimalSeleccionado(null);
    setMensajeExito(`${mensaje} para ${arete}${nombre}.`);
    setTimeout(() => {
      setMensajeExito(null);
    }, 4500);
  };

  const abrirSelector = (tipo: TipoAccionRapida) => {
    if (!puedeEjecutarAccion(tipo, role)) return;
    setAccionActiva(tipo);
    setAnimalSeleccionado(null);
    setIsFormOpen(false);
    setBusqueda("");
  };

  const seleccionarAnimal = (animal: Animal) => {
    setAnimalSeleccionado(animal);
    setIsFormOpen(true);
  };

  const cancelarFlujo = () => {
    setAccionActiva(null);
    setAnimalSeleccionado(null);
    setIsFormOpen(false);
    setBusqueda("");
  };

  // Filtrado de animales según la acción y la búsqueda del usuario
  const animalesFiltrados = useMemo(
    () => filtrarAnimalesAccion(animales, accionActiva, busqueda),
    [animales, accionActiva, busqueda],
  );

  const configActual = accionActiva ? CONFIG_ACCIONES[accionActiva] : null;

  return (
    <section className="flex flex-col gap-3">
      {/* Banner de notificación de éxito */}
      {mensajeExito && (
        <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success-bg/80 px-4 py-3 text-sm font-medium text-success shadow-xs transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-success hover:opacity-75"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
        Acciones Rápidas
      </h2>

      {/* Grid de 3 tarjetas de acción rápida */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6">
        {(["tratamiento", "reproductivo", "leche"] as const).map((tipo) => {
          const config = CONFIG_ACCIONES[tipo];
          const permitido = puedeEjecutarAccion(tipo, role);

          return (
            <button
              key={tipo}
              type="button"
              data-testid={`accion-rapida-${tipo}`}
              disabled={!permitido}
              aria-disabled={!permitido}
              onClick={() => abrirSelector(tipo)}
              className={
                permitido
                  ? "group block w-full text-left rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md cursor-pointer"
                  : "block w-full text-left rounded-2xl border border-slate-200/60 bg-slate-50/70 p-5 sm:p-6 opacity-60 cursor-not-allowed select-none"
              }
            >
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={`text-sm sm:text-base font-bold transition-colors ${
                    permitido
                      ? "text-slate-900 group-hover:text-navy"
                      : "text-slate-500"
                  }`}
                >
                  {config.titulo}
                </h3>
                {!permitido && (
                  <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Rol no autorizado
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                {config.subtitulo}
              </p>
            </button>
          );
        })}
      </div>

      {/* Modal: Selector de Animal antes de abrir el formulario */}
      {accionActiva && !isFormOpen && configActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header del selector */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-navy">
                  {configActual.tituloSelector}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {configActual.descripcionSelector}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelarFlujo}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Cerrar selector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Input de búsqueda */}
            <div className="relative mt-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar por arete, nombre o categoría..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/20 transition-all"
              />
            </div>

            {/* Lista de animales para elegir */}
            <div className="mt-3 max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {isLoadingAnimales ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs">
                  <Loader2 className="h-5 w-5 animate-spin mb-2" />
                  Cargando animales registrados...
                </div>
              ) : animalesFiltrados.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No se encontraron animales que coincidan con la búsqueda.
                </div>
              ) : (
                animalesFiltrados.map((animal) => (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => seleccionarAnimal(animal)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-navy-light hover:bg-slate-50/80 hover:shadow-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-navy group-hover:bg-navy group-hover:text-white transition-colors">
                        {(animal.nombre || animal.areteInterno).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {animal.areteInterno}
                          </span>
                          {animal.nombre && (
                            <span className="text-xs text-slate-600 truncate">
                              {animal.nombre}
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                          {animal.categoria} • {animal.sexo}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-navy group-hover:translate-x-0.5 transition-transform">
                      Seleccionar →
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Footer con cancelar */}
            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={cancelarFlujo}
                className="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario 1: ModalTratamiento (Ari - MOD-02) */}
      {accionActiva === "tratamiento" && isFormOpen && animalSeleccionado && (
        <ModalTratamiento
          isOpen={isFormOpen}
          onClose={cancelarFlujo}
          animalSexo={animalSeleccionado.sexo}
          animalId={animalSeleccionado.id}
          tenantId={user?.tenantId}
          onSubmit={async (data) => {
            await tratamientoMutation.mutateAsync(data);
          }}
        />
      )}

      {/* Formulario 2: ModalServicio (Cristhian - MOD-03) */}
      {accionActiva === "reproductivo" && isFormOpen && animalSeleccionado && (
        <ModalServicio
          isOpen={isFormOpen}
          onClose={cancelarFlujo}
          animalSexo={animalSeleccionado.sexo}
          onSubmit={async (data) => {
            await servicioMutation.mutateAsync(data);
          }}
        />
      )}

      {/* Formulario 3: ModalProduccionLeche (MOD-06) */}
      {accionActiva === "leche" && isFormOpen && animalSeleccionado && (
        <ModalProduccionLeche
          isOpen={isFormOpen}
          onClose={cancelarFlujo}
          animalId={animalSeleccionado.id}
          animalLabel={animalSeleccionado.areteInterno}
          onSubmit={async (payload) => {
            await produccionMutation.mutateAsync(payload);
          }}
        />
      )}
    </section>
  );
}
