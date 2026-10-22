import { createClient } from '@/lib/supabase/client';
import { BUCKET_ANIMAL_DOCS } from '@/lib/supabase/buckets';

export const MAX_ANIMAL_DOCUMENT_BYTES = 10 * 1024 * 1024;

const FILE_TYPES = {
  pdf: { extension: 'pdf', mime: 'application/pdf' },
  png: { extension: 'png', mime: 'image/png' },
  jpg: { extension: 'jpg', mime: 'image/jpeg' },
  jpeg: { extension: 'jpg', mime: 'image/jpeg' },
} as const;

export function getAnimalDocumentExtension(file: File): 'pdf' | 'png' | 'jpg' {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const fileType = FILE_TYPES[extension as keyof typeof FILE_TYPES];
  if (!fileType) throw new Error('El archivo debe ser PDF, PNG o JPG.');
  if (file.size === 0 || file.size > MAX_ANIMAL_DOCUMENT_BYTES) {
    throw new Error('El archivo debe tener un tamaño mayor que 0 y máximo 10 MiB.');
  }
  if (file.type && file.type !== fileType.mime) {
    throw new Error('El contenido del archivo no coincide con su extensión.');
  }
  return fileType.extension;
}

export function createAnimalDocumentPath(
  tenantId: string,
  animalId: string,
  category: string,
  file: File,
): string {
  const normalizedCategory = category.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!normalizedCategory) throw new Error('Indique el tipo de documento.');
  return `${tenantId}/${animalId}/${normalizedCategory}/${crypto.randomUUID()}.${getAnimalDocumentExtension(file)}`;
}

export async function uploadAnimalDocument(path: string, file: File): Promise<void> {
  const extension = getAnimalDocumentExtension(file);
  if (path.split('.').pop()?.toLowerCase() !== extension) {
    throw new Error('La ruta del archivo no coincide con su tipo.');
  }
  const { error } = await createClient().storage.from(BUCKET_ANIMAL_DOCS).upload(path, file, {
    contentType: FILE_TYPES[extension].mime,
    upsert: false,
  });
  if (error) throw new Error('No se pudo subir el archivo. Intente de nuevo.');
}

export async function removeAnimalDocument(path: string): Promise<void> {
  const { error } = await createClient().storage.from(BUCKET_ANIMAL_DOCS).remove([path]);
  if (error) throw new Error('No se pudo retirar el archivo sin registro.');
}

export async function signedAnimalDocumentUrl(path: string): Promise<string> {
  const { data, error } = await createClient().storage.from(BUCKET_ANIMAL_DOCS).createSignedUrl(path, 60 * 10);
  if (error || !data) throw new Error('No se pudo cargar el documento.');
  return data.signedUrl;
}
