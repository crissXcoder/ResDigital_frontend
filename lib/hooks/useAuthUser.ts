'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { components } from '@/lib/api/openapi.generated';

export type AuthUserProfile = components['schemas']['UserProfileResponseDto'];
export type RolUsuario = AuthUserProfile['rol'];

/**
 * Hook que consume GET /auth/perfil del backend NestJS
 * utilizando TanStack Query y el token de la sesión activa de Supabase.
 */
export function useAuthUser() {
  const query = useQuery<AuthUserProfile | null>({
    queryKey: ['authUserProfile'],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return null;
      }

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

      const response = await fetch(`${backendUrl}/auth/perfil`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o revocado
          return null;
        }
        throw new Error(
          `Error al obtener perfil del usuario (${response.status})`,
        );
      }

      return (await response.json()) as AuthUserProfile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de caché
    retry: 1,
  });

  return {
    user: query.data || null,
    role: query.data?.rol || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isAuthenticated: !!query.data,
  };
}
