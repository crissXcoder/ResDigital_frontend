import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InvitationManagement } from '@/components/auth/InvitationManagement';
import { InvitationAcceptance } from '@/components/auth/InvitationAcceptance';

const mocks = vi.hoisted(() => ({
  fetchApi: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
  role: 'propietario' as string | null,
  replace: vi.fn(),
}));
vi.mock('@/lib/api/client', () => ({ ApiError: class ApiError extends Error {}, fetchApi: mocks.fetchApi }));
vi.mock('@/lib/hooks/useAuthUser', () => ({ useAuthUser: () => ({ role: mocks.role }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getSession: mocks.getSession, updateUser: mocks.updateUser } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = 'propietario';
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: 'qa-invitee', email: 'qa@example.test', user_metadata: { invitacion_id: '11111111-1111-4111-8111-111111111111' } } } },
    error: null,
  });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.fetchApi.mockImplementation((endpoint: string) => endpoint === '/auth/invitaciones'
    ? Promise.resolve([])
    : Promise.resolve({
      success: true,
      invitacionId: '11111111-1111-4111-8111-111111111111',
      rolAsignado: 'peon',
      emailSent: true,
      expiresAt: '2026-10-22T09:00:00.000Z',
    }));
});
afterEach(cleanup);

describe('RF-002 invitaciones', () => {
  it('guarda invitación por API y muestra su envío, rol y vencimiento', async () => {
    render(<InvitationManagement />);
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'QA Invitado' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'qa@example.test' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar invitación' }).closest('form')!);

    await screen.findByText('Invitación enviada.');
    expect(mocks.fetchApi).toHaveBeenCalledWith('/auth/invitar', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByText(/Rol: peon\. Vence:/)).toBeTruthy();
  });

  it('muestra errores del servidor sin afirmar que se envió el correo', async () => {
    mocks.fetchApi.mockImplementation((endpoint: string) => endpoint === '/auth/invitaciones'
      ? Promise.resolve([])
      : Promise.reject(new Error('fallo')));
    render(<InvitationManagement />);
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'QA Invitado' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'qa@example.test' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Enviar invitación' }).closest('form')!);
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo invitar');
  });

  it('confirma con el id recibido por correo y muestra la finca y el rol del API', async () => {
    mocks.fetchApi.mockResolvedValueOnce({ success: true, userId: 'qa-invitee', rolFinal: 'peon' })
      .mockResolvedValueOnce({ userId: 'qa-invitee', tenantId: 'finca-a', rol: 'peon', nombreCompleto: 'QA Invitado', correo: 'qa@example.test', nombreFinca: 'Finca QA' });
    render(<InvitationAcceptance />);
    await screen.findByText(/Invitación para qa@example.test/);
    for (const [label, value] of [
      ['Nombre completo', 'QA Invitado'],
      ['Crear contraseña', 'password-segura-qa'],
      ['Confirmar contraseña', 'password-segura-qa'],
    ]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.submit(screen.getByRole('button', { name: 'Aceptar invitación' }).closest('form')!);

    await screen.findByRole('heading', { name: 'Invitación aceptada' });
    expect(mocks.fetchApi).toHaveBeenNthCalledWith(1, '/auth/confirmar-invitacion', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ nombreCompleto: 'QA Invitado', invitacionId: '11111111-1111-4111-8111-111111111111' }),
    }));
    expect(document.body.textContent).toContain('Finca: Finca QA');
    expect(document.body.textContent).toContain('Rol: peon');
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'password-segura-qa' });
  });

  it('muestra que no se pudo usar un enlace vencido o inválido', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    render(<InvitationAcceptance />);
    expect(await screen.findByRole('heading', { name: 'Enlace vencido o inválido' })).toBeTruthy();
  });

  it('mantiene al invitado sin aceptar ante una respuesta rechazada del backend', async () => {
    mocks.fetchApi.mockRejectedValueOnce(new Error('expired'));
    render(<InvitationAcceptance />);
    await screen.findByText(/Invitación para qa@example.test/);
    for (const [label, value] of [
      ['Nombre completo', 'QA Invitado'],
      ['Crear contraseña', 'password-segura-qa'],
      ['Confirmar contraseña', 'password-segura-qa'],
    ]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.submit(screen.getByRole('button', { name: 'Aceptar invitación' }).closest('form')!);

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
