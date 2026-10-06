'use client';

import React from 'react';
import { useAuthUser, type RolUsuario } from '@/lib/hooks/useAuthUser';

interface RequireRoleProps {
  roles: RolUsuario[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ==============================================================================
 * RECORDATORIO DE SEGURIDAD (Regla de Arquitectura):
 * ------------------------------------------------------------------------------
 * Este componente es EXCLUSIVAMENTE para conveniencia de experiencia de usuario (UX),
 * ocultando botones, enlaces o secciones que no corresponden al rol del usuario.
 *
 * La autorización y seguridad real VIVE SIEMPRE EN EL BACKEND (NestJS @Roles y
 * PostgreSQL Row Level Security). Nunca asumir que ocultar un elemento en React
 * protege una acción o dato confidencial.
 * ==============================================================================
 */
export function RequireRole({
  roles,
  children,
  fallback = null,
}: RequireRoleProps) {
  const { role, isLoading } = useAuthUser();

  if (isLoading) {
    return null;
  }

  if (!role || !roles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
