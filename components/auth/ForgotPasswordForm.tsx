'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

const forgotPasswordSchema = z.object({
  correo: z.string().email('Ingresá un correo electrónico válido'),
});

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      correo: '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      setSuccessMessage(null);
      setIsLoading(true);

      try {
        const supabase = createClient();
        const redirectTo = `${window.location.origin}/actualizar-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(
          value.correo.trim(),
          {
            redirectTo,
          },
        );

        if (error) {
          setServerError(error.message);
          setIsLoading(false);
          return;
        }

        setSuccessMessage(
          'Si existe una cuenta asociada a este correo, recibirás un enlace seguro para restablecer tu contraseña.',
        );
        setIsLoading(false);
      } catch {
        setServerError('Ocurrió un error inesperado al procesar la solicitud.');
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Recuperar Contraseña
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Te enviaremos las instrucciones de recuperación a tu correo
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
            Volver a Iniciar Sesión
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
            name="correo"
            validators={{
              onChange: ({ value }) => {
                const res = forgotPasswordSchema.shape.correo.safeParse(value);
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
                  placeholder="usuario@finca.cr"
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
            {isLoading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
          </button>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="text-secondary hover:underline font-semibold"
            >
              Volver a Iniciar Sesión
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
