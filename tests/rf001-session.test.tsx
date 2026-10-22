import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardLayout from '@/app/(dashboard)/layout';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn(), onAuthStateChange: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/lib/api/animales', () => ({ getAnimales: async () => [] }));

const profileA = { userId: 'qa-user-a', tenantId: 'qa-tenant-a', rol: 'propietario',
  nombreCompleto: 'QA RF001 A', correo: 'qa-a@example.com', nombreFinca: 'QA finca A' };
const sessionA = { user: { id: profileA.userId }, access_token: 'synthetic-unit-token' } as Session;
let listener: (event: AuthChangeEvent, session: Session | null) => void;
const fetchProfile = vi.fn();
let client: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  auth.getSession.mockResolvedValue({ data: { session: sessionA }, error: null });
  auth.onAuthStateChange.mockImplementation((callback) => {
    listener = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  fetchProfile.mockImplementation(async () => new Response(JSON.stringify(profileA)));
  vi.stubGlobal('fetch', fetchProfile);
});
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });

async function mount() {
  render(<QueryClientProvider client={client}><DashboardLayout><p>Datos privados</p><Draft /></DashboardLayout></QueryClientProvider>);
  await waitFor(() => expect(auth.onAuthStateChange).toHaveBeenCalled());
}

function Draft() {
  const [value, setValue] = React.useState('');
  return <input aria-label="Borrador sin guardar" value={value} onChange={(event) => setValue(event.target.value)} />;
}

describe('RF-001 acceso a contenido y cambios de sesión', () => {
  it('borra datos de dominio al perder el perfil antes de recuperar otra pertenencia', async () => {
    await mount();
    await act(async () => listener('INITIAL_SESSION', sessionA));
    await screen.findByText('Datos privados');
    client.setQueryData(['qa-private'], 'Datos finca A');
    fetchProfile.mockImplementation(async () => new Response('{}', { status: 401 }));
    await act(async () => listener('TOKEN_REFRESHED', sessionA));
    await screen.findByText(/no tiene acceso a una finca activa/i);
    expect(client.getQueryData(['qa-private'])).toBeUndefined();
    fetchProfile.mockImplementation(async () => new Response(JSON.stringify({ ...profileA, tenantId: 'qa-tenant-b' })));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Datos privados');
    expect(client.getQueryData(['qa-private'])).toBeUndefined();
  });

  it('descarta borradores y cachés si el perfil renovado cambia de finca o rol', async () => {
    await mount();
    await act(async () => listener('INITIAL_SESSION', sessionA));
    await screen.findByText('Datos privados');
    fireEvent.change(screen.getByLabelText('Borrador sin guardar'), { target: { value: 'Edición anterior' } });
    client.setQueryData(['qa-private'], 'Datos finca A');
    fetchProfile.mockImplementation(async () => new Response(JSON.stringify({ ...profileA, tenantId: 'qa-tenant-b', rol: 'peon' })));
    await act(async () => listener('TOKEN_REFRESHED', sessionA));
    await waitFor(() => expect(screen.getByLabelText('Borrador sin guardar')).toHaveProperty('value', ''));
    expect(client.getQueryData(['qa-private'])).toBeUndefined();
  });

  it('conserva el borrador al renovar el token de la misma pertenencia', async () => {
    await mount();
    await act(async () => listener('INITIAL_SESSION', sessionA));
    await screen.findByText('Datos privados');
    fireEvent.change(screen.getByLabelText('Borrador sin guardar'), { target: { value: 'Edición pendiente' } });
    await act(async () => listener('TOKEN_REFRESHED', sessionA));
    await screen.findByText('Datos privados');
    expect(screen.getByLabelText('Borrador sin guardar')).toHaveProperty('value', 'Edición pendiente');
  });
  it('no muestra contenido protegido mientras valida la sesión y la finca', async () => {
    await mount();
    expect(screen.queryByText('Datos privados')).toBeNull();
    await act(async () => listener('INITIAL_SESSION', sessionA));
    await screen.findByText('Datos privados');
    expect(screen.getByText('QA RF001 A')).toBeDefined();
  });

  it('retira datos y cachés de la finca anterior al cerrar sesión en otra pestaña', async () => {
    await mount();
    await act(async () => listener('INITIAL_SESSION', sessionA));
    await screen.findByText('Datos privados');
    client.setQueryData(['qa-private'], 'Datos finca A');
    await act(async () => listener('SIGNED_OUT', null));
    expect(screen.queryByText('Datos privados')).toBeNull();
    expect(screen.queryByText('QA RF001 A')).toBeNull();
    expect(client.getQueryData(['qa-private'])).toBeUndefined();
  });

  it('bloquea una sesión sin finca y permite reintentar un fallo del perfil', async () => {
    fetchProfile.mockImplementation(async () => new Response('{}', { status: 401 }));
    await mount();
    await act(async () => listener('INITIAL_SESSION', sessionA));
    await screen.findByText(/no tiene acceso a una finca activa/i);
    expect(screen.queryByText('Datos privados')).toBeNull();
    fetchProfile.mockImplementation(async () => new Response(JSON.stringify(profileA)));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Datos privados');
  });

  it('informa si el cierre de sesión falla y mantiene disponible el reintento', async () => {
    auth.signOut.mockResolvedValue({ error: new Error('unavailable') });
    await mount();
    await act(async () => listener('INITIAL_SESSION', sessionA));
    await screen.findByText('Datos privados');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No se pudo cerrar la sesión'));
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveProperty('disabled', false);
  });
});
