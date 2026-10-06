/**
 * Nombres de los buckets de Supabase Storage.
 *
 * Se leen de variables de entorno para no quemar el nombre en cada call site.
 * El fallback es el nombre real del bucket en el proyecto, de modo que la app
 * siga funcionando si alguien levanta el front sin estas variables.
 *
 * Políticas vigentes en los tres buckets: lectura pública (para `getPublicUrl`),
 * escritura (insert/update/delete) restringida al rol `authenticated`.
 */

export const BUCKET_DOCUMENTOS =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET_DOCUMENTOS || 'documentos';

export const BUCKET_ANIMAL_DOCS =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ANIMAL_DOCS || 'animal_docs';

export const BUCKET_ANIMALES_FOTOS =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET_ANIMALES_FOTOS || 'animales-fotos';
