'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

const loginSchema = z.object({
  correo: z.string().email('Ingresá un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      correo: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      setIsLoading(true);

      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: value.correo.trim(),
          password: value.password,
        });

        if (error) {
          console.error('[LoginForm] Error retornado por Supabase Auth:', error);
          const errorMsg = error.message?.toLowerCase() || '';
          const errorCode = (error as { code?: string }).code;

          if (
            errorMsg.includes('invalid login credentials') ||
            errorCode === 'invalid_credentials'
          ) {
            setServerError('Correo o contraseña incorrectos.');
          } else if (errorMsg.includes('email not confirmed')) {
            setServerError(
              'Tu correo aún no ha sido confirmado. Revisá tu bandeja de entrada.',
            );
          } else {
            setServerError(error.message || 'Error al autenticar con el servidor.');
          }
          setIsLoading(false);
          return;
        }

        // Refrescar el router para que el middleware reconozca la sesión en cookies
        router.push(redirectPath);
        router.refresh();
      } catch (err: unknown) {
        console.error(
          '[LoginForm] Excepción inesperada durante el inicio de sesión:',
          err,
        );
        if (err instanceof Error) {
          setServerError(
            process.env.NODE_ENV === 'development'
              ? `Error de inicialización o conexión: ${err.message}`
              : 'Ocurrió un error inesperado al iniciar sesión.',
          );
        } else {
          setServerError('Ocurrió un error inesperado al iniciar sesión.');
        }
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-2xl shadow-2xl p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Iniciar Sesión
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ingresá a tu cuaderno de campo digital ResDigital
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-5 p-3 rounded-md bg-danger-bg text-danger border border-danger/30 text-sm font-medium"
        >
          {serverError}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="correo"
          validators={{
            onChange: ({ value }) => {
              const res = loginSchema.shape.correo.safeParse(value);
              return res.success ? undefined : res.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <div>
              <label
                htmlFor={field.name}
                className="block text-sm font-medium text-foreground mb-1"
              >
                Correo electrónico
              </label>
              <input
                id={field.name}
                name={field.name}
                type="email"
                autoComplete="email"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="ganadero@finca.cr"
                className="w-full px-3 py-2 rounded-md border border-input bg-white text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="mt-1 text-xs text-danger font-medium">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => {
              const res = loginSchema.shape.password.safeParse(value);
              return res.success ? undefined : res.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={field.name}
                  className="block text-sm font-medium text-foreground"
                >
                  Contraseña
                </label>
                <Link
                  href="/recuperar-password"
                  className="text-xs text-secondary hover:underline font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="current-password"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-md border border-input bg-white text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="mt-1 text-xs text-danger font-medium">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-2.5 px-4 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-navy-light focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
        >
          {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        ¿Aún no tenés una finca registrada?{' '}
        <Link
          href="/registro"
          className="text-secondary hover:underline font-semibold"
        >
          Registrar finca nueva
        </Link>
      </div>
    </div>
  );
}
