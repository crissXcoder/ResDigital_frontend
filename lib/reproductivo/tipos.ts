import type { components } from '../api/openapi.generated';

export type EstadoReproductivo =
  components['schemas']['EstadoReproductivoResponseDto']['estadoActual'];
export type TipoHito = components['schemas']['HitoReproductivoDto']['tipo'];
export type TipoEventoFeed =
  components['schemas']['ProximoEventoReproductivoDto']['tipo'];
export type TipoEvento = components['schemas']['EventoWriteResponseDto']['tipo'];
export type TipoServicio = components['schemas']['RegistrarServicioDto']['tipoServicio'];
export type MetodoDiagnostico =
  components['schemas']['RegistrarDiagnosticoDto']['metodo'];
export type ResultadoDiagnostico =
  components['schemas']['RegistrarDiagnosticoDto']['resultado'];
export type FacilidadParto = NonNullable<
  components['schemas']['RegistrarPartoDto']['facilidadParto']
>;

export const TIPOS_SERVICIO: readonly TipoServicio[] = [
  'Inseminación Artificial',
  'Monta Natural',
];

export const METODOS_DIAGNOSTICO: readonly MetodoDiagnostico[] = [
  'Palpación',
  'Ecografía',
  'PAG',
];

export const RESULTADOS_DIAGNOSTICO: readonly ResultadoDiagnostico[] = [
  'Preñada',
  'Vacía',
];

export const FACILIDADES_PARTO: readonly FacilidadParto[] = [
  'Normal',
  'Distocia',
  'Cesárea',
  'Aborto',
];

export type HitoReproductivo = components['schemas']['HitoReproductivoDto'];
export type ResumenServicioActivo =
  components['schemas']['ResumenServicioActivoDto'];
export type ResumenDiagnosticoActivo =
  components['schemas']['ResumenDiagnosticoActivoDto'];
export type ResumenPartoActivo = components['schemas']['ResumenPartoActivoDto'];
export type ResumenSecadoActivo =
  components['schemas']['ResumenSecadoActivoDto'];
export type EstadoReproductivoResponse =
  components['schemas']['EstadoReproductivoResponseDto'];

export type DetalleServicio = components['schemas']['DetalleServicioDto'];
export type DetalleDiagnostico = components['schemas']['DetalleDiagnosticoDto'];
export type DetalleParto = components['schemas']['DetallePartoDto'];
export type DetalleEvento = DetalleServicio | DetalleDiagnostico | DetalleParto;
export type EventoHistorial =
  components['schemas']['EventoReproductivoHistorialDto'];
export type ProximoEvento =
  components['schemas']['ProximoEventoReproductivoDto'];
export type HitosReproductivos = components['schemas']['HitosReproductivosDto'];

export function esDetalleServicio(
  evento: EventoHistorial,
): evento is EventoHistorial & { detalle: DetalleServicio } {
  return evento.tipo === 'SERVICIO' && evento.detalle != null;
}

export function esDetalleDiagnostico(
  evento: EventoHistorial,
): evento is EventoHistorial & { detalle: DetalleDiagnostico } {
  return evento.tipo === 'DIAGNOSTICO' && evento.detalle != null;
}

export function esDetalleParto(
  evento: EventoHistorial,
): evento is EventoHistorial & { detalle: DetalleParto } {
  return evento.tipo === 'PARTO' && evento.detalle != null;
}
