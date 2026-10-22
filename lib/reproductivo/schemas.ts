import { z } from 'zod';
import { SEXOS } from '../api/catalogos';
import type { PartoInput } from '../api/reproductivo';
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

export const fechaEventoSchema = z
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

export const MODALIDADES_CRIA = ['ninguna', 'nueva', 'existente'] as const;
export type ModalidadCria = (typeof MODALIDADES_CRIA)[number];

const partoCamposSchema = z.object({
  fechaEvento: fechaEventoSchema,
  eventoServicioId: z
    .string()
    .uuid('El eventoServicioId debe ser un UUID válido')
    .optional()
    .or(z.literal('')),
  modalidadCria: z.enum(MODALIDADES_CRIA),
  criaAnimalId: z.string(),
  areteInterno: z.string(),
  sexo: z
    .enum(SEXOS, {
      message: "El sexo de la cría debe ser 'Hembra' o 'Macho'",
    })
    .optional()
    .or(z.literal('')),
  pesoNacimientoKg: z.string(),
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

export const partoSchema = partoCamposSchema.superRefine((valor, ctx) => {
  if (valor.modalidadCria === 'nueva' && !valor.areteInterno.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['areteInterno'],
      message: 'El arete interno de la cría es obligatorio.',
    });
  }
  if (valor.modalidadCria === 'existente') {
    const uuid = z.string().uuid('El criaAnimalId debe ser un UUID válido');
    const res = uuid.safeParse(valor.criaAnimalId);
    if (!res.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['criaAnimalId'],
        message: 'El criaAnimalId debe ser un UUID válido',
      });
    }
  }
  if (valor.pesoNacimientoKg.trim()) {
    const peso = Number(valor.pesoNacimientoKg);
    if (Number.isNaN(peso) || peso < 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['pesoNacimientoKg'],
        message: 'El peso de nacimiento no puede ser negativo',
      });
    }
  }
});

export type PartoFormValues = z.infer<typeof partoCamposSchema>;

export function partoAPayload(value: PartoFormValues): PartoInput {
  const payload: PartoInput = {
    fechaEvento: value.fechaEvento,
    eventoServicioId: value.eventoServicioId || undefined,
    facilidadParto:
      (value.facilidadParto as PartoInput['facilidadParto']) || undefined,
    observaciones: value.observaciones || undefined,
  };

  if (value.modalidadCria === 'nueva') {
    const peso = value.pesoNacimientoKg.trim()
      ? Number(value.pesoNacimientoKg)
      : undefined;
    payload.nuevaCria = {
      areteInterno: value.areteInterno.trim(),
      sexo: value.sexo || undefined,
      pesoNacimientoKg: peso,
    };
    return payload;
  }

  if (value.modalidadCria === 'existente') {
    payload.criaAnimalId = value.criaAnimalId;
  }

  return payload;
}

export const secadoSchema = z.object({
  fechaEvento: fechaEventoSchema,
  notas: notasOpcionales,
});

export type SecadoFormValues = z.infer<typeof secadoSchema>;
