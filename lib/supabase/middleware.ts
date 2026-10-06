import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Actualiza la sesión de Supabase Auth en las cookies de la respuesta
 * y aplica la regla de protección de rutas a nivel de Middleware.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Si no están configuradas las variables, continuar para evitar bloqueo en build estático
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: Se debe llamar a supabase.auth.getUser() para refrescar
  // la sesión y validar el token criptográficamente contra Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rutas que requieren sesión activa obligatoria
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/hato') ||
    pathname.startsWith('/sanitario') ||
    pathname.startsWith('/reproductivo') ||
    pathname.startsWith('/potreros') ||
    pathname.startsWith('/leche') ||
    pathname.startsWith('/reportes');

  // Soporte para pruebas automatizadas E2E (Playwright) en desarrollo/test
  const isE2EBypass =
    process.env.NODE_ENV !== 'production' &&
    request.cookies.get('playwright_test_session')?.value === 'true';

  // Si intenta acceder a ruta protegida sin sesión, redirigir a /login
  if (isProtectedRoute && !user && !isE2EBypass) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Si el usuario ya está autenticado e intenta ir a login o registro, redirigir al dashboard
  if (user && (pathname === '/login' || pathname === '/registro')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
