import { z } from 'zod';
import {
  FACILIDADES_PARTO,
  METODOS_DIAGNOSTICO,
  RESULTADOS_DIAGNOSTICO,
  TIPOS_SERVICIO,
} from './tipos';
import { hoyLocal } from './fechas';

/**
 * Esquemas Zod del módulo Reproductivo, campo a campo espejo de los DTOs de
 * `class-validator` del backend (backend/src/reproductivo/dto/*.dto.ts). Los
 * mensajes repiten los del backend para que validar en el cliente y validar
 * en el servidor no den textos distintos ante el mismo error.
 */

const fechaEventoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD')
  // Comparación de strings ISO: ordena igual que la fecha y evita reintroducir
  // el corrimiento de zona horaria que ya se corrigió en el backend.
  .refine((valor) => valor <= hoyLocal(), 'La fecha no puede ser futura');

const notasOpcionales = z
  .string()
  .max(2000, 'Las notas no pueden superar los 2000 caracteres')
  .optional()
  .or(z.literal(''));

export const servicioSchema = z.object({
  fechaEvento: fechaEventoSchema,
  tipoServicio: z.enum(TIPOS_SERVICIO as [string, ...string[]], {
    message:
      "El tipo de servicio debe ser 'Inseminación Artificial' o 'Monta Natural'. 'Celo Detectado' es informativo y no genera cronograma.",
  }),
  toroOPajilla: z
    .string()
    .min(1, 'El toro o código de pajilla es requerido')
    .max(200, 'El toro o código de pajilla no puede superar los 200 caracteres'),
  responsable: z
    .string()
    .max(200, 'El responsable no puede superar los 200 caracteres')
    .optional()
    .or(z.literal('')),
  notas: notasOpcionales,
});

export type ServicioFormValues = z.infer<typeof servicioSchema>;

export const diagnosticoSchema = z.object({
  fechaEvento: fechaEventoSchema,
  eventoServicioId: z.string().uuid('El eventoServicioId debe ser un UUID válido'),
  metodo: z.enum(METODOS_DIAGNOSTICO as [string, ...string[]], {
    message: "El método debe ser uno de: 'Palpación', 'Ecografía', 'PAG'",
  }),
  resultado: z.enum(RESULTADOS_DIAGNOSTICO as [string, ...string[]], {
    message: "El resultado debe ser 'Preñada' o 'Vacía'",
  }),
  notas: notasOpcionales,
});

export type DiagnosticoFormValues = z.infer<typeof diagnosticoSchema>;

export const partoSchema = z.object({
  fechaEvento: fechaEventoSchema,
  eventoServicioId: z
    .string()
    .uuid('El eventoServicioId debe ser un UUID válido')
    .optional()
    .or(z.literal('')),
  criaAnimalId: z
    .string()
    .uuid('El criaAnimalId debe ser un UUID válido')
    .optional()
    .or(z.literal('')),
  facilidadParto: z
    .enum(FACILIDADES_PARTO as [string, ...string[]], {
      message: `La facilidad del parto debe ser uno de: ${FACILIDADES_PARTO.join(', ')}`,
    })
    .optional()
    .or(z.literal('')),
  observaciones: z
    .string()
    .max(2000, 'Las observaciones no pueden superar los 2000 caracteres')
    .optional()
    .or(z.literal('')),
});

export type PartoFormValues = z.infer<typeof partoSchema>;

export const secadoSchema = z.object({
  fechaEvento: fechaEventoSchema,
  notas: notasOpcionales,
});

export type SecadoFormValues = z.infer<typeof secadoSchema>;
