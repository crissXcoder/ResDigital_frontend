import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
const renewed = vi.hoisted(() => ({ callback: undefined as undefined | ((cookies: { name: string; value: string; options?: { path?: string } }[], headers?: Record<string, string>) => void) }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: typeof renewed.callback } }) => {
    renewed.callback = options.cookies.setAll;
    return { auth };
  },
}));
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic-unit-key');
  auth.getUser.mockImplementation(async () => {
    renewed.callback?.([{ name: 'qa-renewed', value: 'synthetic-unit-cookie', options: { path: '/' } }], { 'Cache-Control': 'private, no-store' });
    return { data: { user: { id: 'qa-user' } }, error: null };
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('RF-001 proxy y renovación', () => {
  it('conserva cookies renovadas y evita caché pública al redirigir al dashboard', async () => {
    const response = await updateSession(new NextRequest('http://localhost:3000/login'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
    expect(response.cookies.get('qa-renewed')?.value).toBe('synthetic-unit-cookie');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('protege QR sin usuario y conserva el destino local', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await updateSession(new NextRequest('http://localhost:3000/qr'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fqr');
  });
  it('no permite acceso a hato sin configuración de Auth', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const response = await updateSession(new NextRequest('http://localhost:3000/hato'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?redirect=%2Fhato');
  });
});
