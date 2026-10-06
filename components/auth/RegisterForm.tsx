'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

const registerSchema = z
  .object({
    nombreCompleto: z
      .string()
      .min(3, 'El nombre completo debe tener al menos 3 caracteres'),
    nombreFinca: z
      .string()
      .min(2, 'El nombre de la finca debe tener al menos 2 caracteres'),
    correo: z.string().email('Ingresá un correo electrónico válido'),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirmá tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export function RegisterForm() {
  const router = useRouter();

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      nombreCompleto: '',
      nombreFinca: '',
      correo: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      setSuccessMessage(null);
      setIsLoading(true);

      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email: value.correo.trim(),
          password: value.password,
          options: {
            data: {
              nombre_completo: value.nombreCompleto.trim(),
              nombre_finca: value.nombreFinca.trim(),
            },
          },
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            setServerError('Ya existe una cuenta registrada con este correo.');
          } else {
            setServerError(error.message);
          }
          setIsLoading(false);
          return;
        }

        // Si Supabase no requiere confirmación de correo o ya inició sesión
        if (data.session) {
          router.push('/dashboard');
          router.refresh();
          return;
        }

        // Si requiere confirmación por correo electrónico
        setSuccessMessage(
          '¡Finca y cuenta creadas con éxito! Te enviamos un enlace de confirmación a tu correo para activar el acceso.',
        );
        setIsLoading(false);
      } catch {
        setServerError('Ocurrió un error inesperado al registrar la finca.');
        setIsLoading(false);
      }
    },
  });

  if (successMessage) {
    return (
      <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 sm:p-8 text-center">
        <div className="w-12 h-12 bg-success-bg text-success rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          ✓
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Verificá tu correo
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {successMessage}
        </p>
        <Link
          href="/login"
          className="inline-block py-2.5 px-6 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-navy-light transition-colors"
        >
          Volver a Iniciar Sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Registrar Nueva Finca
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Creá tu finca ganadera y comenzá a registrar tu hato
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
          name="nombreCompleto"
          validators={{
            onChange: ({ value }) => {
              const res =
                registerSchema.shape.nombreCompleto.safeParse(value);
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
                Tu nombre completo
              </label>
              <input
                id={field.name}
                name={field.name}
                type="text"
                autoComplete="name"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Don Juan Pérez"
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
          name="nombreFinca"
          validators={{
            onChange: ({ value }) => {
              const res = registerSchema.shape.nombreFinca.safeParse(value);
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
                Nombre de tu finca
              </label>
              <input
                id={field.name}
                name={field.name}
                type="text"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Finca La Esperanza"
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
          name="correo"
          validators={{
            onChange: ({ value }) => {
              const res = registerSchema.shape.correo.safeParse(value);
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
                placeholder="propietario@finca.cr"
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
              const res = registerSchema.shape.password.safeParse(value);
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
                Contraseña
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
            onChangeListenTo: ['password'],
            onChange: ({ value, fieldApi }) => {
              const password = fieldApi.form.getFieldValue('password');
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
                Confirmar contraseña
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
          {isLoading ? 'Registrando finca...' : 'Registrar Finca'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tenés una cuenta?{' '}
        <Link
          href="/login"
          className="text-secondary hover:underline font-semibold"
        >
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
