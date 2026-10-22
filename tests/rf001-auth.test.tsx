import React from 'react';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));
const navigation = vi.hoisted(() => ({ navigate: vi.fn(), refresh: vi.fn(), redirect: '' }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.navigate, replace: navigation.navigate, refresh: navigation.refresh }),
  useSearchParams: () => new URLSearchParams({ redirect: navigation.redirect }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  navigation.redirect = '/hato';
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
});
afterEach(cleanup);

describe('RF-001 formularios de acceso', () => {
  it.each(['login', 'registro'])('no envía contraseñas en la URL antes de hidratar %s', (page) => {
    const { container } = render(page === 'login' ? <LoginForm /> : <RegisterForm />);
    expect(container.querySelector('form')?.getAttribute('method')).toBe('post');
  });

  it.each(['javascript:alert(1)', '//example.com', '/\\example.com'])('no navega al destino no confiable %s', async (redirect) => {
    navigation.redirect = redirect;
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'rf001@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: randomUUID() } });
    fireEvent.submit(screen.getByRole('button', { name: 'Iniciar Sesión' }).closest('form')!);
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('conserva un destino interno válido después de iniciar sesión', async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'rf001@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: randomUUID() } });
    fireEvent.submit(screen.getByRole('button', { name: 'Iniciar Sesión' }).closest('form')!);
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('/hato'));
  });

  it('rechaza un registro vacío aun si se envía el formulario directamente', async () => {
    render(<RegisterForm />);
    fireEvent.submit(screen.getByRole('button', { name: 'Registrar Finca' }).closest('form')!);
    await waitFor(() => expect(screen.getAllByText(/al menos|válido|Confirmá/).length).toBeGreaterThan(0));
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('no confirma una finca si Supabase pide confirmar el correo', async () => {
    const password = randomUUID();
    render(<RegisterForm />);
    for (const [label, value] of [
      ['Tu nombre completo', 'QA RF001'], ['Nombre de tu finca', 'QA RF001 finca'],
      ['Correo electrónico', 'rf001@example.com'], ['Contraseña', password], ['Confirmar contraseña', password],
    ]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.submit(screen.getByRole('button', { name: 'Registrar Finca' }).closest('form')!);
    await screen.findByRole('heading', { name: 'Verificá tu correo' });
    expect(screen.queryByText(/Finca y cuenta creadas con éxito/)).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
