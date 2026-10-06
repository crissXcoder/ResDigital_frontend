'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

const updatePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirmá tu contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export function UpdatePasswordForm() {
  const router = useRouter();

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      setSuccessMessage(null);
      setIsLoading(true);

      try {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
          password: value.newPassword,
        });

        if (error) {
          setServerError(error.message);
          setIsLoading(false);
          return;
        }

        setSuccessMessage(
          'Tu contraseña ha sido actualizada con éxito. Ya podés acceder a tu cuenta.',
        );
        setIsLoading(false);

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch {
        setServerError('Ocurrió un error inesperado al actualizar la contraseña.');
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Actualizar Contraseña
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ingresá tu nueva contraseña para proteger tu cuenta
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

      {successMessage ? (
        <div className="space-y-6">
          <div
            role="status"
            className="p-4 rounded-md bg-success-bg text-success border border-success/30 text-sm font-medium text-center leading-relaxed"
          >
            {successMessage}
          </div>
          <Link
            href="/login"
            className="block w-full py-2.5 px-4 rounded-md bg-primary text-primary-foreground font-medium text-sm text-center hover:bg-navy-light transition-colors"
          >
            Ir al Inicio de Sesión
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="newPassword"
            validators={{
              onChange: ({ value }) => {
                const res =
                  updatePasswordSchema.shape.newPassword.safeParse(value);
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
                  Nueva contraseña
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
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
            name="confirmPassword"
            validators={{
              onChangeListenTo: ['newPassword'],
              onChange: ({ value, fieldApi }) => {
                const password = fieldApi.form.getFieldValue('newPassword');
                if (value !== password) {
                  return 'Las contraseñas no coinciden';
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <label
                  htmlFor={field.name}
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Confirmar nueva contraseña
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Repite tu contraseña"
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
            {isLoading ? 'Actualizando...' : 'Establecer nueva contraseña'}
          </button>
        </form>
      )}
    </div>
  );
}
