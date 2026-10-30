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
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = ['/dashboard', '/hato', '/sanitario', '/reproductivo',
    '/potreros', '/leche', '/produccion', '/equipo', '/reportes', '/qr'].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return isProtectedRoute ? NextResponse.redirect(loginUrl) : supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          }),
        );
        Object.entries(cacheHeaders ?? {}).forEach(([name, value]) => supabaseResponse.headers.set(name, value));
      },
    },
  });

  // IMPORTANTE: Se debe llamar a supabase.auth.getUser() para refrescar
  // la sesión y validar el token criptográficamente contra Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let redirectUrl;
  if (isProtectedRoute && !user) {
    redirectUrl = loginUrl;
  }

  // Si el usuario ya está autenticado e intenta ir a login o registro, redirigir al dashboard
  if (user && (pathname === '/login' || pathname === '/registro')) {
    redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
  }
  supabaseResponse.headers.set('Cache-Control', 'private, no-store');
  if (redirectUrl) {
    const response = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    for (const name of ['Cache-Control', 'Expires', 'Pragma']) {
      const value = supabaseResponse.headers.get(name);
      if (value) response.headers.set(name, value);
    }
    return response;
  }
  return supabaseResponse;
}
