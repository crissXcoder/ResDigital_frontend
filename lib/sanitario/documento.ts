import { createClient } from '@/lib/supabase/client';
import { BUCKET_ANIMAL_DOCS } from '@/lib/supabase/buckets';

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONES: Record<string, string> = { pdf: 'pdf', png: 'png', jpg: 'jpg', jpeg: 'jpg' };

/** Las recetas anteriores al bucket privado se guardaron como URL pública. */
export function esUrlHeredada(documento: string): boolean {
  return /^https?:\/\//i.test(documento);
}

/** Misma ruta que exige el backend y la política del bucket privado `animal_docs`. */
export function rutaDocumentoTratamiento(tenantId: string, animalId: string, archivo: File): string {
  const ext = EXTENSIONES[archivo.name.split('.').pop()?.toLowerCase() ?? ''];
  if (!ext) throw new Error('El documento debe ser PDF, PNG o JPG.');
  if (archivo.size === 0 || archivo.size > MAX_BYTES) {
    throw new Error('El documento debe tener un tamaño mayor que 0 y máximo 10 MB.');
  }
  return `${tenantId}/${animalId}/tratamiento/${crypto.randomUUID()}.${ext}`;
}

export async function subirDocumentoTratamiento(ruta: string, archivo: File): Promise<void> {
  const { error } = await createClient().storage.from(BUCKET_ANIMAL_DOCS).upload(ruta, archivo);
  if (error) throw new Error('Error al subir el documento. Por favor intente de nuevo.');
}

export async function retirarDocumentoTratamiento(ruta: string): Promise<void> {
  const { error } = await createClient().storage.from(BUCKET_ANIMAL_DOCS).remove([ruta]);
  if (error) console.error('No se pudo retirar el archivo sin registro:', error);
}

export async function urlFirmadaDocumento(ruta: string): Promise<string> {
  const { data, error } = await createClient().storage.from(BUCKET_ANIMAL_DOCS).createSignedUrl(ruta, 60 * 10);
  if (error || !data) throw new Error('No se pudo cargar el documento.');
  return data.signedUrl;
}
