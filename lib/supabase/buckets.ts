/**
 * Nombres de los buckets de Supabase Storage.
 *
 * El único bucket en uso es `animal_docs`: privado, limitado a 10 MiB y a
 * PDF/PNG/JPEG, con políticas por tenant. Los nombres `documentos` y
 * `animales-fotos` son residuales; no deben existir como buckets públicos.
 */
export const BUCKET_ANIMAL_DOCS =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ANIMAL_DOCS || 'animal_docs';
