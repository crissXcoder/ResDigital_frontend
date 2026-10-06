import { createBrowserClient } from '@supabase/ssr';

/**
 * Crea un cliente Supabase para ser utilizado en el navegador (Client Components).
 * Utiliza cookies de sesión automáticamente gestionadas por @supabase/ssr.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan las variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).',
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
